import React, { useState, useEffect } from "react";
import { FiSun, FiMoon, FiSend } from "react-icons/fi";
import "./Chatui.css";

const Chatui = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [languageDetector, setLanguageDetector] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  // Store the selected translation language per message index
  const [translationSelections, setTranslationSelections] = useState({});

  // Initialize the language detector using the provided snippet
  useEffect(() => {
    const initLanguageDetector = async () => {
      try {
        const languageDetectorCapabilities =
          await self.ai.languageDetector.capabilities();
        const canDetect = languageDetectorCapabilities.capabilities;
        let detector;
        if (canDetect === "no") {
          console.warn("The language detector isn't usable.");
          return;
        }
        if (canDetect === "readily") {
          detector = await self.ai.languageDetector.create();
        } else {
          detector = await self.ai.languageDetector.create({
            monitor(m) {
              m.addEventListener("downloadprogress", (e) => {
                console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
              });
            },
          });
          await detector.ready;
        }
        setLanguageDetector(detector);
      } catch (error) {
        console.error("Error initializing language detector:", error);
      }
    };
    initLanguageDetector();
  }, []);

  // Toggle dark mode by adding/removing the "dark" class on the root element.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    setError("");
    let detectedLanguage = "en"; // default
    if (languageDetector) {
      try {
        const results = await languageDetector.detect(input);
        if (results && results.length > 0) {
          detectedLanguage = results[0].detectedLanguage;
          console.log(
            "Detected language:",
            detectedLanguage,
            results[0].confidence
          );
        }
      } catch (error) {
        console.error("Language detection error:", error);
      }
    }
    const newMessage = { text: input, sender: "user", detectedLanguage };
    setMessages([...messages, newMessage]);
    setInput("");
  };

  const handleSummarize = (index) => {
    setMessages((prev) =>
      prev.map((msg, i) => {
        if (i === index) {
          return {
            ...msg,
            summary: "Summary: " + msg.text.substring(0, 100) + "...",
          };
        }
        return msg;
      })
    );
  };

  const handleTranslate = async (index) => {
    const selectedLang = translationSelections[index] || "en";
    const sourceLanguage = messages[index].detectedLanguage || "en";
    console.log(
      `Attempting translation from ${sourceLanguage} to ${selectedLang}`
    );
    if (sourceLanguage === selectedLang) {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === index ? { ...msg, translatedText: msg.text } : msg
        )
      );
      return;
    }
    try {
      const translator = await self.ai.translator.create({
        sourceLanguage: sourceLanguage,
        targetLanguage: selectedLang,
      });
      const translated = await translator.translate(messages[index].text);
      console.log("Translated text:", translated);
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === index ? { ...msg, translatedText: translated } : msg
        )
      );
    } catch (error) {
      console.error("Translation error:", error);
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === index ? { ...msg, translatedText: "Translation error." } : msg
        )
      );
    }
  };

  const handleLanguageChange = (index, lang) => {
    setTranslationSelections((prev) => ({ ...prev, [index]: lang }));
  };

  // Copy translated text to clipboard
  const handleCopyTranslation = (index) => {
    const translatedText = messages[index].translatedText;
    if (translatedText) {
      navigator.clipboard
        .writeText(translatedText)
        .then(() => {
          alert("Copied to clipboard!");
        })
        .catch((err) => {
          console.error("Error copying text:", err);
        });
    }
  };

  // Send message when Enter is pressed (without Shift)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1 className="chat-title">
          lingua<span>AI</span>
        </h1>
        <button
          className="toggle-button"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <FiSun color="#ffffff" size={24} />
          ) : (
            <FiMoon size={24} />
          )}
        </button>
      </header>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="empty-message">
              No messages yet. Start a conversation!
            </p>
          )}
          {messages.map((msg, index) => (
            <div key={index} className="message-container">
              <div className="message-wrapper message-user">
                <div className="message-bubble">{msg.text}</div>
              </div>
              {/* Show the action panel directly below the user's message */}
              <div className="action-panel">
                <p className="detected-language">
                  Detected Language: {msg.detectedLanguage}
                </p>
                {msg.text.length > 150 && !msg.summary && (
                  <button
                    className="action-button"
                    onClick={() => handleSummarize(index)}
                  >
                    Summarize
                  </button>
                )}
                {msg.summary && <p className="summary">{msg.summary}</p>}
                <div className="translate-section">
                  <select
                    value={translationSelections[index] || "en"}
                    onChange={(e) =>
                      handleLanguageChange(index, e.target.value)
                    }
                  >
                    <option value="en">English</option>
                    <option value="pt">Portuguese</option>
                    <option value="es">Spanish</option>
                    <option value="ru">Russian</option>
                    <option value="tr">Turkish</option>
                    <option value="fr">French</option>
                  </select>
                  <button
                    className="action-button"
                    onClick={() => handleTranslate(index)}
                  >
                    Translate
                  </button>
                </div>
                {msg.translatedText && (
                  <div className="translated-container">
                    <p className="translated-text">{msg.translatedText}</p>
                    <button
                      className="copy-button"
                      onClick={() => handleCopyTranslation(index)}
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
        ></textarea>
        <button className="send-button" onClick={handleSendMessage}>
          <FiSend size={24} />
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Chatui;
