import { ShoppingCart, Home, Car, Pill, GraduationCap, Flame, Coffee, Film, Plane, Zap, Shirt, Smile, CreditCard, HelpCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import React from "react";

export function getCategoryIcon(category: string, type: string = "expense", className: string = "w-5 h-5") {
  if (type === "income") return <ArrowUpRight className={className} />;
  if (type === "deduction") return <ArrowDownRight className={className} />;
  
  const norm = (category || "").toLowerCase();
  
  if (norm.includes("aliment") || norm.includes("supermercado") || norm.includes("padaria") || norm.includes("ifood") || norm.includes("restaurante")) return <ShoppingCart className={className} />;
  if (norm.includes("moradia") || norm.includes("aluguel") || norm.includes("casa") || norm.includes("condomínio")) return <Home className={className} />;
  if (norm.includes("transporte") || norm.includes("uber") || norm.includes("gasolina") || norm.includes("carro") || norm.includes("ônibus")) return <Car className={className} />;
  if (norm.includes("saúde") || norm.includes("farmácia") || norm.includes("médico") || norm.includes("unimed")) return <Pill className={className} />;
  if (norm.includes("educação") || norm.includes("escola") || norm.includes("curso") || norm.includes("faculdade")) return <GraduationCap className={className} />;
  if (norm.includes("luz") || norm.includes("energia") || norm.includes("conta") || norm.includes("água") || norm.includes("internet")) return <Zap className={className} />;
  if (norm.includes("café") || norm.includes("lanche") || norm.includes("restaurante")) return <Coffee className={className} />;
  if (norm.includes("lazer") || norm.includes("cinema") || norm.includes("netflix") || norm.includes("spotify") || norm.includes("festa") || norm.includes("jogo")) return <Film className={className} />;
  if (norm.includes("viagem") || norm.includes("férias") || norm.includes("hotel") || norm.includes("passagem")) return <Plane className={className} />;
  if (norm.includes("roupa") || norm.includes("vestuário") || norm.includes("shopping") || norm.includes("calçado")) return <Shirt className={className} />;
  if (norm.includes("beleza") || norm.includes("cabelo") || norm.includes("estética") || norm.includes("salão")) return <Smile className={className} />;
  if (norm.includes("cartão") || norm.includes("fatura") || norm.includes("crédito") || norm.includes("nubank") || norm.includes("banco") || norm.includes("picpay")) return <CreditCard className={className} />;
  if (norm.includes("assinatura") || norm.includes("software") || norm.includes("mensalidade") || norm.includes("clube")) return <Flame className={className} />;
  
  return <HelpCircle className={className} />;
}

export function guessCategoryFromDescription(desc: string): string {
  const norm = (desc || "").toLowerCase();
  
  if (norm.includes("padaria") || norm.includes("mercado") || norm.includes("ifood") || norm.includes("restaurante") || norm.includes("lanche") || norm.includes("café") || norm.includes("comida") || norm.includes("pizza") || norm.includes("hamburguer") || norm.includes("supermercado")) return "Alimentação";
  if (norm.includes("uber") || norm.includes("gasolina") || norm.includes("combustível") || norm.includes("ônibus") || norm.includes("metrô") || norm.includes("pedágio") || norm.includes("estacionamento") || norm.includes("carro") || norm.includes("99")) return "Transporte";
  if (norm.includes("farmácia") || norm.includes("médico") || norm.includes("remédio") || norm.includes("consulta") || norm.includes("exame") || norm.includes("hospital") || norm.includes("unimed")) return "Saúde";
  if (norm.includes("aluguel") || norm.includes("condomínio") || norm.includes("casa") || norm.includes("iptu") || norm.includes("reforma")) return "Moradia";
  if (norm.includes("escola") || norm.includes("curso") || norm.includes("faculdade") || norm.includes("livro") || norm.includes("material")) return "Educação";
  if (norm.includes("luz") || norm.includes("água") || norm.includes("internet") || norm.includes("celular") || norm.includes("telefone") || norm.includes("energia") || norm.includes("conta")) return "Contas Base";
  if (norm.includes("cinema") || norm.includes("festa") || norm.includes("jogo") || norm.includes("show") || norm.includes("balada") || norm.includes("bar") || norm.includes("cerveja") || norm.includes("ingresso") || norm.includes("netflix") || norm.includes("spotify")) return "Lazer";
  if (norm.includes("viagem") || norm.includes("férias") || norm.includes("hotel") || norm.includes("passagem") || norm.includes("turismo") || norm.includes("airbnb")) return "Viagem";
  if (norm.includes("roupa") || norm.includes("sapato") || norm.includes("shopping") || norm.includes("vestuário") || norm.includes("bolsa") || norm.includes("calçado")) return "Vestuário";
  if (norm.includes("cabelo") || norm.includes("unha") || norm.includes("salão") || norm.includes("estética") || norm.includes("barbearia") || norm.includes("maquiagem")) return "Beleza";
  if (norm.includes("fatura") || norm.includes("cartão") || norm.includes("nubank") || norm.includes("itaú") || norm.includes("bradesco") || norm.includes("banco") || norm.includes("picpay")) return "Cartões e Taxas";
  if (norm.includes("mensalidade") || norm.includes("clube") || norm.includes("software") || norm.includes("assinatura")) return "Assinaturas";
  if (norm.includes("presente") || norm.includes("doação") || norm.includes("caridade")) return "Presentes/Doações";
  
  return "Diversos";
}

export function getCategoryColor(category: string, type: string = "expense") {
  if (type === "income") return "bg-emerald-100 text-emerald-600 border-emerald-200";
  if (type === "deduction") return "bg-rose-100 text-rose-700 border-rose-200";
  
  const norm = (category || "").toLowerCase();
  
  if (norm.includes("aliment")) return "bg-orange-100 text-orange-600 border-orange-200";
  if (norm.includes("moradia")) return "bg-blue-100 text-blue-600 border-blue-200";
  if (norm.includes("transporte")) return "bg-slate-100 text-slate-600 border-slate-200";
  if (norm.includes("saúde")) return "bg-rose-100 text-rose-600 border-rose-200";
  if (norm.includes("educação")) return "bg-indigo-100 text-indigo-600 border-indigo-200";
  if (norm.includes("luz") || norm.includes("energia")) return "bg-yellow-100 text-yellow-600 border-yellow-200";
  if (norm.includes("lazer") || norm.includes("cinema")) return "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200";
  if (norm.includes("cartão")) return "bg-purple-100 text-purple-600 border-purple-200";
  
  return "bg-slate-100 text-slate-500 border-slate-200";
}
