import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clipboard,
  Download,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Brand } from "./Brand";
import { money, number } from "./data";
import "./quotation.css";

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
};
const futureDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};
const dateLabel = (value) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const clean = (value) => String(value || "").trim();
const normalize = (value) => clean(value).toLocaleLowerCase("pt-BR");
const unique = (items) => [...new Set(items.map(clean).filter(Boolean))];
const firstName = (value) => clean(value).split(/\s+/)[0] || "cliente";

const blankQuote = (products) => ({
  sacado: "",
  cliente: "",
  fazenda: "",
  loja: "",
  produto: products[0] || "Diesel S-10",
  litros: "",
  valor: "",
  pagamento: "À vista",
  frete: "A combinar",
  validade: futureDate(7),
  observacoes: "",
});

function Field({ label, required, full, children }) {
  return (
    <label className={full ? "quote-field full" : "quote-field"}>
      <span>
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}

function loadLogo() {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${import.meta.env.BASE_URL}brand/grupo-marajo-logo.png`;
  });
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = clean(text).split(/\s+/);
  let line = "",
    lines = [];
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  });
  if (line) lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((value, index) =>
    ctx.fillText(value, x, y + index * lineHeight),
  );
  return Math.max(lines.length, 1) * lineHeight;
}

async function renderQuoteImage(quote) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3f5f8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(ctx, 55, 45, 1090, 1260, 28, "#ffffff");
  ctx.fillStyle = "#e31b23";
  ctx.fillRect(55, 45, 18, 1260);
  const logo = await loadLogo();
  if (logo) {
    const width = 330,
      height = width * (logo.height / logo.width);
    ctx.drawImage(logo, 105, 92, width, height);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#e31b23";
  ctx.font = "800 44px Inter, Arial, sans-serif";
  ctx.fillText("ORÇAMENTO", 1095, 125);
  ctx.fillStyle = "#7c8796";
  ctx.font = "500 21px Inter, Arial, sans-serif";
  ctx.fillText(`Emitido em ${dateLabel(localDate())}`, 1095, 165);
  ctx.textAlign = "left";
  ctx.fillStyle = "#17243a";
  ctx.font = "700 25px Inter, Arial, sans-serif";
  ctx.fillText("PREPARADO PARA", 105, 260);
  ctx.fillStyle = "#e31b23";
  ctx.font = "800 40px Inter, Arial, sans-serif";
  wrapText(ctx, quote.cliente, 105, 310, 880, 47, 2);
  ctx.fillStyle = "#657286";
  ctx.font = "500 22px Inter, Arial, sans-serif";
  const destination = [quote.fazenda, quote.loja && `Loja ${quote.loja}`]
    .filter(Boolean)
    .join(" · ");
  ctx.fillText(destination || "Local de entrega a definir", 105, 405);
  ctx.fillText(`Sacado: ${quote.sacado || "—"}`, 105, 443);
  roundedRect(ctx, 105, 495, 990, 88, 16, "#fff3f3");
  ctx.fillStyle = "#9d1c24";
  ctx.font = "700 22px Inter, Arial, sans-serif";
  ctx.fillText("PROPOSTA VÁLIDA ATÉ", 135, 532);
  ctx.fillStyle = "#d81f28";
  ctx.font = "800 30px Inter, Arial, sans-serif";
  ctx.fillText(dateLabel(quote.validade), 135, 566);
  const columns = [105, 510, 730, 1095];
  ctx.fillStyle = "#f7f8fa";
  ctx.fillRect(105, 630, 990, 68);
  ctx.fillStyle = "#637084";
  ctx.font = "700 19px Inter, Arial, sans-serif";
  ctx.fillText("PRODUTO", columns[0] + 20, 673);
  ctx.fillText("QUANTIDADE", columns[1], 673);
  ctx.fillText("VALOR/LITRO", columns[2], 673);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", columns[3] - 20, 673);
  ctx.textAlign = "left";
  ctx.fillStyle = "#18263c";
  ctx.font = "700 27px Inter, Arial, sans-serif";
  ctx.fillText(quote.produto, columns[0] + 20, 752);
  ctx.fillText(`${number(+quote.litros || 0)} L`, columns[1], 752);
  ctx.fillText(money(+quote.valor || 0), columns[2], 752);
  ctx.textAlign = "right";
  ctx.fillStyle = "#d91d27";
  ctx.font = "800 31px Inter, Arial, sans-serif";
  ctx.fillText(
    money((+quote.litros || 0) * (+quote.valor || 0)),
    columns[3] - 20,
    752,
  );
  ctx.textAlign = "left";
  ctx.strokeStyle = "#e4e8ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(105, 790);
  ctx.lineTo(1095, 790);
  ctx.stroke();
  ctx.fillStyle = "#748093";
  ctx.font = "700 18px Inter, Arial, sans-serif";
  ctx.fillText("CONDIÇÃO DE PAGAMENTO", 105, 850);
  ctx.fillText("ENTREGA / FRETE", 615, 850);
  ctx.fillStyle = "#24324a";
  ctx.font = "600 25px Inter, Arial, sans-serif";
  ctx.fillText(quote.pagamento || "A combinar", 105, 890);
  ctx.fillText(quote.frete || "A combinar", 615, 890);
  if (clean(quote.observacoes)) {
    ctx.fillStyle = "#748093";
    ctx.font = "700 18px Inter, Arial, sans-serif";
    ctx.fillText("OBSERVAÇÕES", 105, 965);
    ctx.fillStyle = "#3c485b";
    ctx.font = "500 22px Inter, Arial, sans-serif";
    wrapText(ctx, quote.observacoes, 105, 1005, 950, 32, 4);
  }
  ctx.strokeStyle = "#e4e8ee";
  ctx.beginPath();
  ctx.moveTo(105, 1155);
  ctx.lineTo(1095, 1155);
  ctx.stroke();
  ctx.fillStyle = "#17243a";
  ctx.font = "800 24px Inter, Arial, sans-serif";
  ctx.fillText("GRUPO MARAJÓ", 105, 1210);
  ctx.fillStyle = "#7b8797";
  ctx.font = "500 19px Inter, Arial, sans-serif";
  ctx.fillText("Combustível para mover o seu negócio.", 105, 1245);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e31b23";
  ctx.font = "700 19px Inter, Arial, sans-serif";
  ctx.fillText("Obrigado pela preferência!", 1095, 1230);
  return canvas;
}

const canvasBlob = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Imagem indisponível")),
      "image/png",
    ),
  );

export function Quotation({ clients, products, onMessage }) {
  const [quote, setQuote] = useState(() => blankQuote(products));
  const [lookup, setLookup] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key, value) =>
    setQuote((current) => ({ ...current, [key]: value }));
  const matches = useMemo(() => {
    const term = normalize(lookup);
    if (!term) return [];
    return clients
      .filter((client) =>
        normalize(
          `${client.sacado} ${client.cliente} ${client.fazenda} ${client.loja}`,
        ).includes(term),
      )
      .slice(0, 8);
  }, [clients, lookup]);
  const choose = (client) => {
    setQuote((current) => ({
      ...current,
      sacado: clean(client.sacado),
      cliente: clean(client.cliente),
      fazenda: clean(client.fazenda),
      loja: clean(client.loja),
    }));
    setLookup(`${client.sacado} · ${client.cliente}`);
    setFocused(false);
  };
  const total = (+quote.litros || 0) * (+quote.valor || 0);
  const ready =
    clean(quote.cliente) &&
    clean(quote.produto) &&
    +quote.litros > 0 &&
    +quote.valor > 0 &&
    quote.validade;
  const copyImage = async () => {
    if (!ready) {
      onMessage("Preencha cliente, produto, litragem, valor e validade.");
      return;
    }
    setBusy(true);
    try {
      const canvas = await renderQuoteImage(quote);
      const blob = await canvasBlob(canvas);
      if (navigator.clipboard?.write && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          onMessage(
            "Imagem do orçamento copiada. Agora é só colar na conversa do cliente.",
          );
          return;
        } catch {}
      }
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `orcamento-${firstName(quote.cliente).toLowerCase()}-${localDate()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onMessage(
        "O navegador não permitiu copiar. A imagem foi baixada para você enviar.",
      );
    } catch {
      onMessage("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="quotation-page">
    <div className="quote-editor panel liquid-glass">
      <span className="liquid-glass__refraction" aria-hidden="true" />
        <div className="quote-section-heading">
          <span className="quote-heading-icon">
            <ShoppingBag size={21} />
          </span>
          <div>
            <h2>Montar orçamento</h2>
            <p>Pesquise o sacado e preencha as condições comerciais.</p>
          </div>
        </div>
        <div className="quote-form">
          <Field label="Pesquisar sacado ou cliente" full required>
            <div className="quote-lookup">
              <Search size={18} />
              <input
                value={lookup}
                onFocus={() => setFocused(true)}
                onChange={(event) => {
                  setLookup(event.target.value);
                  setFocused(true);
                }}
                placeholder="Digite o número do sacado ou nome do cliente"
                autoComplete="off"
              />
              {focused && lookup && (
                <div className="quote-suggestions">
                  {matches.length ? (
                    matches.map((client) => (
                      <button
                        type="button"
                        key={client.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(client)}
                      >
                        <b>
                          {client.sacado} · {client.cliente}
                        </b>
                        <span>
                          {client.fazenda || "Sem fazenda"} · Loja {client.loja}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>Nenhum sacado encontrado.</p>
                  )}
                </div>
              )}
            </div>
          </Field>
          <Field label="Cliente" required>
            <input
              value={quote.cliente}
              onChange={(event) => update("cliente", event.target.value)}
              placeholder="Nome do cliente"
            />
          </Field>
          <Field label="Fazenda / local de entrega">
            <input
              value={quote.fazenda}
              onChange={(event) => update("fazenda", event.target.value)}
              placeholder="Local de entrega"
            />
          </Field>
          <Field label="Produto" required>
            <select
              value={quote.produto}
              onChange={(event) => update("produto", event.target.value)}
            >
              {unique(products).map((product) => (
                <option key={product}>{product}</option>
              ))}
            </select>
          </Field>
          <Field label="Litragem" required>
            <div className="quote-input-unit">
              <input
                type="number"
                min="0"
                step="1"
                value={quote.litros}
                onChange={(event) => update("litros", event.target.value)}
                placeholder="0"
              />
              <span>L</span>
            </div>
          </Field>
          <Field label="Valor por litro" required>
            <div className="quote-input-unit prefix">
              <span>R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quote.valor}
                onChange={(event) => update("valor", event.target.value)}
                placeholder="0,00"
              />
            </div>
          </Field>
          <Field label="Validade do orçamento" required>
            <div className="quote-date">
              <CalendarDays size={17} />
              <input
                type="date"
                min={localDate()}
                value={quote.validade}
                onChange={(event) => update("validade", event.target.value)}
              />
            </div>
          </Field>
          <Field label="Condição de pagamento">
            <input
              value={quote.pagamento}
              onChange={(event) => update("pagamento", event.target.value)}
              placeholder="Ex.: À vista"
            />
          </Field>
          <Field label="Entrega / frete">
            <input
              value={quote.frete}
              onChange={(event) => update("frete", event.target.value)}
              placeholder="Ex.: Frete incluso"
            />
          </Field>
          <Field label="Observações" full>
            <textarea
              value={quote.observacoes}
              onChange={(event) => update("observacoes", event.target.value)}
              placeholder="Informações adicionais para o cliente"
            />
          </Field>
        </div>
        <div className="quote-total">
          <span>Valor total do orçamento</span>
          <strong>{money(total)}</strong>
          <small>
            {quote.litros
              ? `${number(+quote.litros || 0)} litros de ${quote.produto}`
              : "Informe a quantidade e o valor por litro"}
          </small>
        </div>
        <div className="quote-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setQuote(blankQuote(products));
              setLookup("");
            }}
          >
            Limpar
          </button>
          <button
            type="button"
            className="btn primary quote-copy"
            disabled={busy}
            onClick={copyImage}
          >
            {busy ? (
              <>
                <Sparkles size={17} />
                Gerando imagem...
              </>
            ) : (
              <>
                <Clipboard size={17} />
                Copiar imagem
              </>
            )}
          </button>
        </div>
      </div>
      <div className="quote-preview-wrap">
        <div className="quote-preview-label">
          <span>
            <Sparkles size={15} /> Prévia para o cliente
          </span>
          <small>A imagem será gerada em alta qualidade</small>
        </div>
      <article className="quote-preview liquid-glass">
        <span className="liquid-glass__refraction" aria-hidden="true" />
          <div className="quote-preview-top">
            <Brand />
            <div>
              <b>ORÇAMENTO</b>
              <small>Emitido em {dateLabel(localDate())}</small>
            </div>
          </div>
          <div className="quote-customer">
            <small>PREPARADO PARA</small>
            <h2>{quote.cliente || "Nome do cliente"}</h2>
            <p>
              {[quote.fazenda, quote.loja && `Loja ${quote.loja}`]
                .filter(Boolean)
                .join(" · ") || "Local de entrega"}
            </p>
            <span>Sacado: {quote.sacado || "—"}</span>
          </div>
          <div className="quote-validity">
            <CalendarDays size={18} />
            <span>Proposta válida até</span>
            <b>{dateLabel(quote.validade)}</b>
          </div>
          <div className="quote-product-head">
            <span>PRODUTO</span>
            <span>QUANTIDADE</span>
            <span>VALOR/L</span>
          </div>
          <div className="quote-product-row">
            <b>{quote.produto || "—"}</b>
            <b>{number(+quote.litros || 0)} L</b>
            <b>{money(+quote.valor || 0)}</b>
          </div>
          <div className="quote-preview-total">
            <span>TOTAL DO ORÇAMENTO</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="quote-conditions">
            <div>
              <small>PAGAMENTO</small>
              <b>{quote.pagamento || "A combinar"}</b>
            </div>
            <div>
              <small>ENTREGA / FRETE</small>
              <b>{quote.frete || "A combinar"}</b>
            </div>
          </div>
          {quote.observacoes && (
            <div className="quote-note">
              <small>OBSERVAÇÕES</small>
              <p>{quote.observacoes}</p>
            </div>
          )}
          <div className="quote-preview-footer">
            <span>
              <Check size={14} /> Grupo Marajó
            </span>
            <small>Obrigado pela preferência!</small>
          </div>
        </article>
        <div className="quote-mobile-tip">
          <Download size={15} /> Se o celular não permitir copiar, o arquivo PNG
          será baixado automaticamente.
        </div>
      </div>
    </section>
  );
}
