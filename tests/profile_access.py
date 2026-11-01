"""Profile browser regression against npm run preview.

Python Playwright + Chromium required. Every Supabase request is intercepted;
no real account, database, or company data is accessed by these checks.
"""
import argparse
import base64
import copy
import json
import time
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright


USER_ID = "57274dc4-0e8e-479f-aa77-317a4d0a1815"
AVATAR_KEY = f"marajo-avatar:{USER_ID}"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=")


class MockCloud:
    def __init__(self):
        self.user = {"id": USER_ID, "aud": "authenticated", "role": "authenticated", "email": "teodoro@grupomarajo.local", "user_metadata": {}, "app_metadata": {"provider": "email"}, "created_at": "2026-10-20T00:00:00Z", "identities": []}
        self.rows = {"marajo-entregas-v1": [], "marajo-clientes-v1": []}
        self.auth_writes = []
        self.avatar_writes = []
        self.fail_avatar = False
        self.fail_user_update = False
        self.stale_login_metadata = None

    def session(self):
        expiry = int(time.time()) + 3600
        encoded = base64.urlsafe_b64encode(json.dumps({"sub": USER_ID, "exp": expiry, "aud": "authenticated"}).encode()).decode().rstrip("=")
        user = copy.deepcopy(self.user)
        if self.stale_login_metadata is not None:
            user["user_metadata"] = self.stale_login_metadata
        return {"access_token": f"eyJhbGciOiJIUzI1NiJ9.{encoded}.test-only", "refresh_token": "profile-test-only", "token_type": "bearer", "expires_at": expiry, "expires_in": 3600, "user": user}

    def route(self, route):
        request = route.request
        parsed = urlparse(request.url)
        payload = request.post_data_json if request.post_data else None

        def respond(value, status=200):
            route.fulfill(status=status, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(value))

        if request.method == "OPTIONS":
            return respond({})
        if parsed.path.endswith("/auth/v1/signup"):
            self.auth_writes.append(payload)
            self.user["email"] = payload["email"]
            self.user["user_metadata"] = payload.get("data", {})
            return respond(self.session())
        if parsed.path.endswith("/auth/v1/token"):
            return respond(self.session())
        if parsed.path.endswith("/auth/v1/user"):
            if request.method == "PUT":
                self.auth_writes.append(payload)
                if self.fail_user_update:
                    return respond({"message": "Profile update unavailable", "code": "unexpected_failure"}, 500)
                self.user["user_metadata"].update(payload.get("data", {}))
            return respond(self.user)
        if parsed.path.endswith("/auth/v1/logout"):
            return respond({})
        if parsed.path.endswith("/rest/v1/marajo_app_state"):
            if request.method == "GET":
                key = parse_qs(parsed.query).get("key", [""])[0].removeprefix("eq.")
                return respond({"value": self.rows[key]} if key in self.rows else None)
            row = payload[0] if isinstance(payload, list) else payload
            if row["key"].startswith("marajo-avatar:"):
                self.avatar_writes.append(row)
                if self.fail_avatar:
                    return respond({"message": "Photo storage unavailable", "code": "XX000"}, 500)
            self.rows[row["key"]] = row["value"]
            return respond({})
        raise AssertionError(f"Unexpected mocked request: {request.method} {parsed.path}")


def new_page(browser, cloud, url, width=1440):
    context = browser.new_context(viewport={"width": width, "height": 1000})
    context.route("https://**.supabase.co/**", cloud.route)
    page = context.new_page()
    page.set_default_timeout(10000)
    page.errors = []
    page.on("pageerror", lambda error: page.errors.append(str(error)))
    page.goto(url)
    page.get_by_role("button", name="Entrar", exact=True).wait_for()
    return context, page


def login(page):
    page.get_by_label("Usuário", exact=True).fill("TEODORO")
    page.get_by_label("Senha", exact=True).fill("test123")
    page.get_by_role("button", name="Entrar", exact=True).click()
    page.get_by_role("button", name="Meu perfil", exact=True).wait_for()


def type_continuously(page, label, value):
    control = page.get_by_label(label, exact=True)
    control.fill("")
    control.click()
    control.evaluate("el => window.originalProfileInput = el")
    for character in value:
        page.keyboard.type(character)
        assert control.evaluate("el => el === window.originalProfileInput && el === document.activeElement"), f"{label} lost focus or was recreated after {character!r}"
    assert control.input_value() == value


def upload_photo(page):
    page.get_by_label("Foto de perfil", exact=True).set_input_files({"name": "avatar.png", "mimeType": "image/png", "buffer": PNG})
    page.get_by_role("button", name="Remover foto", exact=True).wait_for()


def run(url, chromium):
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium, args=["--no-sandbox"])

        signup_cloud = MockCloud()
        context, page = new_page(browser, signup_cloud, url, 390)
        page.get_by_role("button", name="Ainda não tem acesso? Criar usuário", exact=True).click()
        type_continuously(page, "Nome completo", "MARIA SOUZA")
        type_continuously(page, "Cargo", "Financeiro")
        upload_photo(page)
        page.get_by_label("Usuário", exact=True).fill("MARIA")
        page.get_by_label("Senha", exact=True).fill("test123")
        assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
        page.get_by_role("button", name="Criar conta", exact=True).click()
        page.get_by_role("button", name="Meu perfil", exact=True).wait_for()
        page.wait_for_function("document.querySelector('.header-profile-button img')?.src.startsWith('data:image/jpeg')")
        assert signup_cloud.user["user_metadata"] == {"full_name": "MARIA SOUZA", "job_title": "Financeiro"}
        assert signup_cloud.rows[AVATAR_KEY]["avatar"].startswith("data:image/jpeg;base64,")
        assert "data:image" not in json.dumps(signup_cloud.auth_writes)
        assert not page.errors, page.errors
        context.close()
        print("PASS: signup saves name/job, photo stored separately; mobile layout and typing")

        retry_cloud = MockCloud()
        retry_cloud.fail_avatar = True
        context, page = new_page(browser, retry_cloud, url)
        page.get_by_role("button", name="Ainda não tem acesso? Criar usuário", exact=True).click()
        page.get_by_label("Nome completo", exact=True).fill("MARIA SOUZA")
        page.get_by_label("Cargo", exact=True).fill("Financeiro")
        upload_photo(page)
        selected_photo = page.locator(".auth-card .profile-avatar img").get_attribute("src")
        page.get_by_label("Usuário", exact=True).fill("MARIA")
        page.get_by_label("Senha", exact=True).fill("test123")
        page.get_by_role("button", name="Criar conta", exact=True).click()
        page.get_by_role("dialog", name="Meu perfil", exact=True).wait_for()
        page.get_by_text("Sua conta foi criada. Não foi possível salvar a foto; tente novamente aqui.", exact=True).wait_for()
        assert page.locator(".profile-editor .profile-avatar img").get_attribute("src") == selected_photo
        assert sum("email" in write for write in retry_cloud.auth_writes) == 1
        assert AVATAR_KEY not in retry_cloud.rows
        retry_cloud.fail_avatar = False
        page.get_by_role("button", name="Salvar perfil", exact=True).click()
        page.get_by_text("Perfil atualizado com sucesso.", exact=True).wait_for()
        assert retry_cloud.rows[AVATAR_KEY]["avatar"] == selected_photo
        assert sum("email" in write for write in retry_cloud.auth_writes) == 1
        assert "data:image" not in json.dumps(retry_cloud.auth_writes)
        assert not page.errors, page.errors
        context.close()
        print("PASS: signup photo failure retains chosen photo; retry saves without creating another account")

        cloud = MockCloud()
        context, page = new_page(browser, cloud, url)
        login(page)
        assert page.locator(".profile-copy b").inner_text() == "teodoro"
        page.get_by_role("button", name="Meu perfil", exact=True).click()
        page.get_by_role("dialog", name="Meu perfil", exact=True).wait_for()
        type_continuously(page, "Nome completo", "TEODORO SILVA")
        type_continuously(page, "Cargo", "Gerente")
        upload_photo(page)
        old_photo = page.locator(".profile-editor .profile-avatar img").get_attribute("src")
        page.get_by_label("Foto de perfil", exact=True).set_input_files({"name": "invalid.txt", "mimeType": "text/plain", "buffer": b"not a photo"})
        page.get_by_text("Escolha uma foto JPG, PNG ou WebP.", exact=True).wait_for()
        assert page.locator(".profile-editor .profile-avatar img").get_attribute("src") == old_photo
        page.get_by_role("button", name="Salvar perfil", exact=True).click()
        page.get_by_text("Perfil atualizado com sucesso.", exact=True).wait_for()
        assert page.locator(".profile-copy b").inner_text() == "TEODORO SILVA"
        assert page.locator(".profile-copy small").inner_text() == "Gerente"
        photo = cloud.rows[AVATAR_KEY]["avatar"]
        assert page.locator(".header-profile-button img").get_attribute("src") == photo
        assert "data:image" not in json.dumps(cloud.auth_writes)
        assert not page.errors, page.errors
        context.close()
        print("PASS: existing user edits name/job/photo; continuous typing; invalid photo preserves current photo")

        # New browser/device: sign-in data may be cached, so getUser must fetch fresh metadata.
        cloud.stale_login_metadata = {}
        context, page = new_page(browser, cloud, url, 390)
        login(page)
        page.wait_for_function("document.querySelector('.profile-copy b')?.textContent === 'TEODORO SILVA'")
        page.wait_for_function("document.querySelector('.header-profile-button img')?.src.startsWith('data:image/jpeg')")
        assert page.locator(".header-profile-button img").get_attribute("src") == photo
        assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
        page.get_by_role("button", name="Meu perfil", exact=True).click()
        page.get_by_role("button", name="Remover foto", exact=True).click()
        page.get_by_role("button", name="Salvar perfil", exact=True).click()
        page.get_by_text("Perfil atualizado com sucesso.", exact=True).wait_for()
        assert cloud.rows[AVATAR_KEY]["avatar"] is None
        assert page.locator(".header-profile-button img").count() == 0
        assert not page.errors, page.errors
        context.close()
        cloud.stale_login_metadata = None
        print("PASS: fresh browser restores remote profile; photo removal persists; mobile profile layout")

        context, page = new_page(browser, cloud, url)
        login(page)
        page.get_by_role("button", name="Meu perfil", exact=True).click()
        upload_photo(page)
        page.get_by_label("Nome completo", exact=True).fill("DO NOT SAVE THIS")
        cloud.fail_avatar = True
        writes_before = len(cloud.auth_writes)
        page.get_by_role("button", name="Salvar perfil", exact=True).click()
        page.get_by_text("Não foi possível salvar a foto. Seus dados não foram alterados. Confira a conexão e tente novamente.", exact=True).wait_for()
        assert page.get_by_role("dialog", name="Meu perfil", exact=True).is_visible()
        assert len(cloud.auth_writes) == writes_before
        assert cloud.rows[AVATAR_KEY]["avatar"] is None
        assert page.get_by_text("Perfil atualizado com sucesso.", exact=True).count() == 0
        cloud.fail_avatar = False
        cloud.fail_user_update = True
        page.get_by_role("button", name="Salvar perfil", exact=True).click()
        page.get_by_text("A foto foi salva, mas não foi possível atualizar nome e cargo. Tente novamente.", exact=True).wait_for()
        assert cloud.rows[AVATAR_KEY]["avatar"].startswith("data:image/jpeg")
        assert cloud.user["user_metadata"]["full_name"] == "TEODORO SILVA"
        assert page.get_by_text("Perfil atualizado com sucesso.", exact=True).count() == 0
        assert not page.errors, page.errors
        context.close()
        print("PASS: photo and auth API errors show honest failure/partial success; no false success toast")
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173/")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    args = parser.parse_args()
    run(args.url, args.chromium)
