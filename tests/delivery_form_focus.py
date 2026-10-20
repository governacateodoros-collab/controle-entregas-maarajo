"""Browser regression: build the app, start npm run preview, then run this file.

Requires Python Playwright and Chromium. Supabase is fully mocked; the test never
signs in to, writes to, or reads from the company's real database.
"""
import argparse
import base64
import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


def run(url, chromium):
    clients = json.loads((Path(__file__).parents[1] / "src/clientes.json").read_text())
    expiry = int(time.time()) + 3600
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "focus-test", "exp": expiry}).encode()).decode().rstrip("=")
    session = {"access_token": f"eyJhbGciOiJIUzI1NiJ9.{payload}.test", "refresh_token": "test-only", "expires_at": expiry, "expires_in": 3600, "token_type": "bearer", "user": {"id": "focus-test", "aud": "authenticated"}}
    state = {
        "marajo-entregas-v1": [],
        "marajo-clientes-v1": clients,
        "marajo-opcoes-entrega-v1": {
            "captadores": ["MARKIEL", "DORI"],
            "motoristas": ["CARLOS EDUARDO"],
            "veiculos": ["ABC1D23"],
            "pagamentos": ["Pix", "Faturado"],
            "produtos": ["Diesel S-10"],
        },
    }
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.route("https://**.supabase.co/**", lambda route: route.fulfill(status=200, content_type="application/json", body="null"))
        page.add_init_script(f"localStorage.setItem('sb-caqhxmwedvgswjlhykbk-auth-token', {json.dumps(json.dumps(session))});")
        for key, value in state.items():
            page.add_init_script(f"localStorage.setItem({json.dumps(key)}, {json.dumps(json.dumps(value))});")
        page.goto(url)
        page.get_by_role("button", name="Nova entrega", exact=True).click()

        def field(label):
            return page.locator('label').filter(has=page.locator('span').filter(has_text=re.compile('^' + re.escape(label) + '$'))).locator('input, select, textarea')

        def type_continuously(label, text):
            control = field(label)
            control.click()
            control.evaluate("el => window.originalInput = el")
            for character in text:
                page.keyboard.type(character)
                assert control.evaluate("el => el === window.originalInput && el === document.activeElement"), f"{label}: input was recreated or lost focus after {character!r}"
            assert control.input_value() == text, f"{label}: text was truncated"
            print(f"PASS: continuous typing — {label}")

        type_continuously("Nº da NF-e", "123456789")
        type_continuously("Buscar pelo nome do cliente", clients[0]["cliente"])
        assert field("Sacado *").input_value() == clients[0]["sacado"]
        assert field("Loja *").input_value() == clients[0]["loja"]
        assert field("Nome da fazenda do cliente *").input_value() == clients[0]["fazenda"]
        type_continuously("Litragem *", "12345")
        type_continuously("Valor do litro (R$) *", "6.19")
        type_continuously("Custo com frete", "R$ 250,00")
        type_continuously("Distância (km)", "120")
        type_continuously("Observação", "Entrega na fazenda pela manhã")
        field("Motorista").select_option("CARLOS EDUARDO")
        field("Veículo").select_option("ABC1D23")
        field("Forma de pagamento").select_option("Faturado")
        assert field("Motorista").input_value() == "CARLOS EDUARDO"
        assert field("Veículo").input_value() == "ABC1D23"
        assert field("Forma de pagamento").input_value() == "Faturado"
        print("PASS: options are selected from the operational registry")
        field("PDF da NF-e").set_input_files({"name": "test.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n%%EOF"})
        page.get_by_text("PDF anexado", exact=True).wait_for()
        field("Captador").select_option("DORI")
        assert field("PDF da NF-e").evaluate("el => el.files.length") == 1
        assert field("Captador").input_value() == "DORI"
        print("PASS: PDF and selection remain after updating another field")
        page.get_by_role("button", name="Salvar entrega", exact=True).click()
        page.get_by_text("Entrega salva com sucesso.", exact=True).wait_for()
        saved = page.evaluate("JSON.parse(localStorage.getItem('marajo-entregas-v1'))[0]")
        assert saved["nfe"] == "123456789" and saved["cliente"] == clients[0]["cliente"]
        assert saved["litros"] == 12345 and saved["valor"] == 6.19
        assert saved["captador"] == "DORI" and saved["anexo"].startswith("data:application/pdf")
        assert not errors, errors
        print("PASS: complete delivery saved with all typed values; no browser errors")
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173/")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    args = parser.parse_args()
    run(args.url, args.chromium)
