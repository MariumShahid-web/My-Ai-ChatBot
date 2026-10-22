
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const STORAGE_KEY = "marium-ai-chats";

function App() {
  const [chats, setChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [activeChatId, setActiveChatId] = useState(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  // Save chat history whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  // Find the currently selected conversation
  const activeChat = chats.find(
    (chat) => chat.id === activeChatId
  );

  const messages = activeChat?.messages || [];

  // Start a fresh conversation
  const newChat = () => {
    if (loading) return;
    setActiveChatId(null);
    setQuestion("");
  };

  // Open a previous conversation
  const openChat = (id) => {
    if (loading) return;
    setActiveChatId(id);
    setQuestion("");
  };

  // Delete one conversation
  const deleteChat = (id) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id));

    if (activeChatId === id) {
      setActiveChatId(null);
      setQuestion("");
    }
  };

  // Ask Gemini a question
  const askQuestion = async () => {
    if (!question.trim() || loading) return;

    const userQuestion = question.trim();
    const chatId =
      activeChatId || crypto.randomUUID();

    const userMessage = {
      role: "user",
      text: userQuestion,
    };

    // Create a new chat or add the question to an existing one
    setChats((prev) => {
      const existingChat = prev.find(
        (chat) => chat.id === chatId
      );

      if (existingChat) {
        return prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, userMessage],
                updatedAt: Date.now(),
              }
            : chat
        );
      }

      return [
        {
          id: chatId,
          title: userQuestion.slice(0, 40),
          messages: [userMessage],
          updatedAt: Date.now(),
        },
        ...prev,
      ];
    });

    setActiveChatId(chatId);
    setQuestion("");
    setLoading(true);

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      const apiRes = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
        {
          systemInstruction: {
            parts: [
              {
                text: "You are a helpful software engineer named MsWebAdobe. Answer software engineering questions clearly and concisely. Politely refuse unrelated questions.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userQuestion }],
            },
          ],
        },
        {
          headers: {
            "x-goog-api-key": API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      const reply =
        apiRes.data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("") || "I couldn't generate a reply.";

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { role: "ai", text: reply },
                ],
                updatedAt: Date.now(),
              }
            : chat
        )
      );
    } catch (error) {
      console.error(
        "Gemini API error:",
        error.response?.data || error
      );

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: "ai",
                    text: "Sorry, something went wrong. Please try again.",
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Show the most recently updated chats first
  const sortedChats = [...chats].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <div className="grid grid-cols-5 h-screen text-center bg-zinc-900">

      {/* LEFT SIDEBAR */}
      <aside className="col-span-1 bg-zinc-800 text-white p-3 md:p-4 flex flex-col min-h-0">

        <h2 className="text-lg md:text-xl font-bold mb-1">
          MsWebadobe
        </h2>

        <p className="text-xs md:text-sm text-zinc-300 mb-5">
          Software Assistant
        </p>

        <button
          onClick={newChat}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-600 p-2 mb-5 hover:bg-zinc-700 disabled:opacity-50 text-sm"
        >
          <span>＋</span>
          <span>New Chat</span>
        </button>

        <p className="text-xs text-zinc-400 text-left mb-2">
          YOUR CHATS
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">

          {sortedChats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-1 rounded-lg p-2 text-left ${
                activeChatId === chat.id
                  ? "bg-zinc-700"
                  : "hover:bg-zinc-700/70"
              }`}
            >
              <button
                onClick={() => openChat(chat.id)}
                disabled={loading}
                title={chat.title}
                className="flex-1 min-w-0 text-sm text-left truncate disabled:opacity-60"
              >
                {chat.title}
              </button>

              <button
                onClick={() => deleteChat(chat.id)}
                disabled={loading}
                title="Delete chat"
                aria-label={`Delete ${chat.title}`}
                className="shrink-0 rounded px-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-600 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}

          {chats.length === 0 && (
            <p className="text-xs text-zinc-500 text-left">
              Your conversations will appear here.
            </p>
          )}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="col-span-4 p-4 md:p-10 flex flex-col min-h-0">

        <h1 className="text-white text-xl md:text-2xl font-bold mb-6">
          {activeChat ? activeChat.title : "How can I help you?"}
        </h1>

        {/* CONVERSATION MESSAGES */}
        <div className="flex-1 min-h-0 overflow-y-auto mb-5 space-y-4">

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3 md:p-4 text-left whitespace-pre-wrap wrap-break-words ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-white"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <p className="text-zinc-400 text-left">
              Marium AI is thinking...
            </p>
          )}
        </div>

        {/* QUESTION INPUT */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            askQuestion();
          }}
          className="bg-zinc-800 w-full md:w-3/4 p-2 text-white m-auto rounded-2xl border border-zinc-700 flex min-h-14"
        >
          <input
            type="text"
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            className="w-full min-w-0 bg-transparent p-3 outline-none"
            placeholder="Ask me about web development..."
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 md:px-5 rounded-xl"
          >
            {loading ? "..." : "Ask"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
