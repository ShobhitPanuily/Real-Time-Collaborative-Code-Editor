import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // When sending
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit("send-message", { roomId, message });
    setMessage("");
  };

  // On receiving
  useEffect(() => {
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("receive-message");
  }, []);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input
            type="text"
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-white">
      {/* Top Navbar */}
      <div className="flex justify-between items-center px-6 py-3 bg-[#2d2d2d] shadow-md z-10">
        <h2 className="text-xl font-semibold">Code Room: {roomId}</h2>
        <div className="flex items-center gap-4">
          <select
            className="bg-gray-800 text-white px-3 py-1 rounded"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button
            onClick={copyRoomId}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded"
          >
            Copy Room ID
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded"
            onClick={leaveRoom}
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#252526] p-4 flex flex-col border-r border-gray-700">
          <h3 className="text-lg font-medium mb-2">Users:</h3>
          <ul className="mb-4">
            {users.map((user, index) => (
              <li key={index} className="truncate">
                {user.slice(0, 8)}...
              </li>
            ))}
          </ul>
          <p className="text-sm text-green-400 mb-4">{typing}</p>

          {/* Chat Section */}
          <div className="flex flex-col flex-1">
            <div
              className="flex-1 overflow-y-auto bg-gray-900 p-2 rounded mb-2"
              id="chat-messages"
            >
              {messages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-semibold">{msg.user}: </span>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-2 py-1 rounded bg-gray-800 text-white"
                placeholder="Type message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>
      </div>
    </div>
  );
};

