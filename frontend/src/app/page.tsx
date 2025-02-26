"use client";
import { useState, useEffect, useRef, ChangeEvent } from "react";
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  continue: boolean;
  interimResults: boolean;
  onresult(event: SpeechRecognitionEvent): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ sender: string; text: string }>
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  //voice input and change to text
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startRecording = () => {
    setIsRecording(true);
    recognitionRef.current = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognitionRef.current.continue = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const { transcript } = event.results[event.results.length - 1][0];
      console.log(event.results);
      setTranscript(transcript);
    };
    recognitionRef.current.start();
  };
  useEffect(() => {
    return () => {
      // Stop the speech recognition if it's active
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  const stopRecording = () => {
    if (recognitionRef.current) {
      // Stop the speech recognition and mark recording as complete
      recognitionRef.current.stop();
      setMessage(transcript);
    }
  };
  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  //File Upload function
  const handlerFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const selectFile = e.target.files?.[0];
    if (selectFile) {
      setFile(selectFile);
      console.log("upload file:", selectFile);
    }
  };
  //send message and file to backend
  const handleSendMessage = async () => {
    if (!message && !file) return;
    const formData = new FormData();
    if (message) {
      formData.append("message", message);
    }
    if (file) {
      formData.append("file", file);
    }
    // Add user message to chat history
    setChatHistory((prev) => [
      ...prev,
      { sender: "User", text: message || `📁 ${file?.name}` },
    ]);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        body: formData, // Send as object with message property
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      // Create a new chatbot response entry
      const chatbotResponse = { sender: "Chatbot", text: "" };
      setChatHistory((prev) => [...prev, chatbotResponse]);

      // Get the reader from the response body
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);

        // Update the chatbot response
        setChatHistory((prev) => {
          const last = prev[prev.length - 1];
          if (last.sender === "Chatbot") {
            return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setChatHistory((prev) => [
        ...prev,
        { sender: "Chatbot", text: "Error: Failed to get response" },
      ]);
    } finally {
      // Clear input
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Chatbot</h1>
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow-md p-4">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`my-2 ${
              chat.sender === "User" ? "text-right" : "text-left"
            }`}
          >
            <strong
              className={
                chat.sender === "User" ? "text-blue-600" : "text-green-600"
              }
            >
              {chat.sender}:
            </strong>
            <span className="ml-2">{chat.text}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col w-full">
        {file && (
          <div className="flex items-center justify-between bg-grey-200 p-2 mb-2 rounded">
            <span className="text-sm">📁{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="text-red-500 hover:text-red-700"
            >
              X
            </button>
          </div>
        )}
        <div className="flex">
          <label className="bg-gray-200 p-2 rounded-1-1g cursor-pointer hover:bg-gray-300">
            📎
            <input
              type="file"
              className="hidden"
              onChange={handlerFileUpload}
            />
          </label>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
            if (e.key === "Enter" && e.shiftKey) {
              setMessage((prev) => prev + "\n");
            }
          }}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-l-lg p-2 resize-y h-16 overflow-y-auto leading-"
        />
        <button
          onClick={() => handleToggleRecording()}
          className={`px-4 py-2 ${
            isRecording ? "bg-red-600" : "bg-gray-300"
          } text-white hover:bg-gray-400 transition`}
        >
          {isRecording ? "⏹️" : "🎙️"}
        </button>
        <button
          onClick={handleSendMessage}
          className="bg-blue-600 text-white rounded-r-lg p-2 hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
