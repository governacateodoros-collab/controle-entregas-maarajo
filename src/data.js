import importedDeliveries from './imported-deliveries.json';

export const products=['Diesel S-10','Diesel S-500','Gasolina','Etanol','ARLA 32'];
export const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export const number=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
// Base oficial importada da planilha operacional. Cada linha preserva a sua origem.
export const initialDeliveries=importedDeliveries;
export const fields=[['data','Data da NFe','datetime-local'],['nfe','Nº NF-e','text'],['sacado','Sacado','text'],['loja','Loja / Filial','store'],['cliente','Cliente','client'],['produto','Produto','product'],['litros','Litros','number'],['valor','Valor por Litro (R$)','number'],['total','Valor Total (R$)','total'],['pagamento','Forma de Pagamento','payment'],['frete','C. C/ Frete','checkbox'],['fazenda','Fazenda / Local de Entrega','text'],['distancia','Distância (km)','number'],['captador','Captador','text'],['motorista','Motorista','text'],['veiculo','Veículo','text'],['observacoes','Observações','textarea']];
