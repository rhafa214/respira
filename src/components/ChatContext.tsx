import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { GoogleGenAI, Type } from "@google/genai";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";

type Message = { role: "user" | "model"; text: string };

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  messages: Message[];
  input: string;
  setInput: (t: string) => void;
  loading: boolean;
  sendMessage: (text: string, audioBase64?: string) => Promise<void>;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Olá! Sou seu Copiloto Financeiro. Diga 'Paguei a internet' ou pergunte 'Qual minha margem real e previsões do mês?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setIsOpen((p) => !p);

  const sendMessage = async (userMessage: string, audioBase64?: string) => {
    if ((!userMessage.trim() && !audioBase64) || !user) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userMessage || "🎙️ Áudio enviado" },
    ]);
    setLoading(true);

    try {
      const uid = user.uid;

      const currentMonthStr = new Date().toISOString().substring(0, 7); // yyyy-MM

      // Get all current context
      const transactionsSnap = await getDocs(
        query(collection(db, "transactions"), where("userId", "==", uid)),
      );
      const debtsSnap = await getDocs(
        query(collection(db, "debts"), where("userId", "==", uid)),
      );
      const wishlistSnap = await getDocs(
        query(collection(db, "wishlist"), where("userId", "==", uid)),
      );
      const marketItemsSnap = await getDocs(
        query(
          collection(db, `market_items_${currentMonthStr}`),
          where("userId", "==", uid),
        ),
      );

      const transactions = transactionsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const debts = debtsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const wishlist = wishlistSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const marketItems = marketItemsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      let contextStr = `Cenário do Usuário em Junho de 2026. Haja como um Assistente Financeiro Inteligente integrado.\n`;
      contextStr += `Você pode executar as tools para atualizar o BD se a intenção do usuário for clara.\n`;
      contextStr += `Transações atuais:\n${JSON.stringify(transactions)}\n`;
      contextStr += `Lista de Mercado do Mês Atual:\n${JSON.stringify(marketItems)}\n`;
      contextStr += `Dívidas ativas:\n${JSON.stringify(debts)}\n`;
      contextStr += `Lista de Desejos (itens que o usuário quer comprar):\n${JSON.stringify(wishlist)}\n`;

      const apiKey =
        process.env.GEMINI_API_KEY ||
        (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "Erro: A chave da API do Gemini não foi encontrada! Se você está na Vercel, adicione `GEMINI_API_KEY` em Project Settings > Environment Variables, desmarque as opções desnecessárias se quiser, e **faça um novo deploy (Redeploy)**.",
          },
        ]);
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const promptContext = `${contextStr}\nPergunta do usuário: "${userMessage || "Por favor, escute o áudio anexo e siga com a solicitação."}"`;

      const contents: any[] = [promptContext];
      if (audioBase64) {
        contents.push({
          inlineData: {
            mimeType: "audio/webm",
            data: audioBase64,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction:
            "Aja como Copiloto Financeiro, estratégico, realista e emocionalmente engajado. \n" +
            "Se o usuário relatar que pagou algo, crie ou altere uma transação usando a tool. \n" +
            "Se o usuário perguntar sobre compras da 'Lista de Desejos', simule estar gerenciando promoções, buscando o melhor preço (mencione algumas lojas reais) e avalie se o orçamento permite a compra daquele item no mês, baseado nas transações e dívidas. \n" +
            "Se o usuário quiser gerenciar a Lista de Mercado, use addMarketItem, updateMarketItem ou deleteMarketItem conforme necessário para manter a lista do mês atualizada. \n" +
            "Sempre que o usuário informar um novo gasto, use addTransaction, passe status como pago se apropriado, ou updateTransactionStatus se for alterar uma existente. \n" +
            "Responda de forma sucinta ao que foi feito e como isso impacta o panorama geral.",
          temperature: 0.3,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "addTransaction",
                  description:
                    "Adiciona uma nova despesa ou receita ao banco de dados no mês.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      type: {
                        type: Type.STRING,
                        description: "income, expense, ou deduction",
                      },
                      date: { type: Type.STRING, description: "YYYY-MM-DD" },
                      status: {
                        type: Type.STRING,
                        description: "paid, pending, late",
                      },
                      isRecurring: { type: Type.BOOLEAN },
                    },
                    required: [
                      "description",
                      "amount",
                      "category",
                      "type",
                      "date",
                      "status",
                    ],
                  },
                },
                {
                  name: "updateTransaction",
                  description:
                    "Atualiza completamente uma transação existente (nome, valor, categoria, status, parcelas)",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      id: {
                        type: Type.STRING,
                        description:
                          "A ID da transação existente retornada no contexto",
                      },
                      description: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      status: {
                        type: Type.STRING,
                        description: "paid, pending, late",
                      },
                      date: { type: Type.STRING, description: "YYYY-MM-DD" },
                      installmentInfo: {
                        type: Type.STRING,
                        description: "Informações de parcela, ex: '1/12'",
                      },
                    },
                    required: ["id"],
                  },
                },
                {
                  name: "addMarketItem",
                  description: "Adiciona um item à lista de mercado",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      estimatedPrice: { type: Type.NUMBER },
                      actualPrice: { type: Type.NUMBER },
                      purchased: { type: Type.BOOLEAN },
                    },
                    required: ["name"],
                  },
                },
                {
                  name: "updateMarketItem",
                  description:
                    "Atualiza um item na lista de mercado (por exemplo, marcar como comprado ou mudar preço)",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      estimatedPrice: { type: Type.NUMBER },
                      actualPrice: { type: Type.NUMBER },
                      purchased: { type: Type.BOOLEAN },
                    },
                    required: ["id"],
                  },
                },
                {
                  name: "deleteMarketItem",
                  description: "Remove um item da lista de mercado",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                    },
                    required: ["id"],
                  },
                },
              ],
            },
          ],
        },
      });

      // Handle tool calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        let toolResults = [];
        for (const call of response.functionCalls) {
          const args = call.args as any;
          if (call.name === "addTransaction") {
            try {
              const docRef = await addDoc(collection(db, "transactions"), {
                ...args,
                userId: uid,
                createdAt: new Date().toISOString(),
              });
              toolResults.push({
                call,
                result: `Transação criada com ID: ${docRef.id}`,
              });
            } catch (e) {
              toolResults.push({ call, result: "Falha ao criar transação." });
            }
          }
          if (call.name === "updateTransaction") {
            try {
              const docRef = doc(db, "transactions", args.id);
              // Extract only what was passed
              const updates: any = {};
              if (args.status) updates.status = args.status;
              if (args.amount) updates.amount = args.amount;
              if (args.description) updates.description = args.description;
              if (args.date) updates.date = args.date;
              if (args.installmentInfo)
                updates.installmentInfo = args.installmentInfo;
              await updateDoc(docRef, updates);
              toolResults.push({
                call,
                result: `Transação ${args.id} atualizada com sucesso.`,
              });
            } catch (e) {
              toolResults.push({
                call,
                result: "Falha ao atualizar transação.",
              });
            }
          }
          if (call.name === "addMarketItem") {
            try {
              const docRef = await addDoc(
                collection(db, `market_items_${currentMonthStr}`),
                {
                  name: args.name,
                  estimatedPrice: args.estimatedPrice || 0,
                  actualPrice: args.actualPrice || 0,
                  purchased: args.purchased || false,
                  userId: uid,
                  createdAt: new Date().toISOString(),
                },
              );
              toolResults.push({
                call,
                result: `Item '${args.name}' adicionado ao mercado com ID: ${docRef.id}`,
              });
            } catch (e) {
              toolResults.push({
                call,
                result: "Falha ao criar item de mercado.",
              });
            }
          }
          if (call.name === "updateMarketItem") {
            try {
              const docRef = doc(
                db,
                `market_items_${currentMonthStr}`,
                args.id,
              );
              const updates: any = {};
              if (args.name !== undefined) updates.name = args.name;
              if (args.estimatedPrice !== undefined)
                updates.estimatedPrice = args.estimatedPrice;
              if (args.actualPrice !== undefined)
                updates.actualPrice = args.actualPrice;
              if (args.purchased !== undefined)
                updates.purchased = args.purchased;
              await updateDoc(docRef, updates);
              toolResults.push({
                call,
                result: `Item de mercado ${args.id} atualizado com sucesso.`,
              });
            } catch (e) {
              toolResults.push({
                call,
                result: "Falha ao atualizar item de mercado.",
              });
            }
          }
          if (call.name === "deleteMarketItem") {
            try {
              await deleteDoc(
                doc(db, `market_items_${currentMonthStr}`, args.id),
              );
              toolResults.push({
                call,
                result: `Item de mercado ${args.id} apagado com sucesso.`,
              });
            } catch (e) {
              toolResults.push({
                call,
                result: "Falha ao apagar item de mercado.",
              });
            }
          }
        }

        // Second pass to let model summarize changes
        const summaryContext = `${promptContext}\nFunções executadas e resultados: ${JSON.stringify(toolResults)}\nCom base nisso, responda ao usuário sobre o que foi feito.`;
        const finalResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: summaryContext,
        });

        if (finalResponse.text) {
          setMessages((prev) => [
            ...prev,
            { role: "model", text: finalResponse.text! },
          ]);
        }
      } else if (response.text) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: response.text! },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Desculpe, tive um problema de conexão." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        input,
        setInput,
        loading,
        sendMessage,
        toggleChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
