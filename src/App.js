import React, { useState, useEffect, useCallback } from "react";
import WordCloudD3 from "./WordCloudD3";

function App() {
  const fullText = "Every word carries the weight of infinite possibilities";
  const fullTextArray = fullText.split(" ");

  const [currentText, setCurrentText] = useState(fullTextArray[0]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [highlightedWord, setHighlightedWord] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const apiEndpoint =
    "https://REPLACE BY HTTP/REST API LAMBDA ENDPOINT";

  const generateNextWord = useCallback(async () => {
    if (currentIndex >= fullTextArray.length) return;

    const targetWord = fullTextArray[currentIndex];

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_words: currentText.split(" "),
          target_word: targetWord,
        }),
      });
      const data = await response.json();

      setWordCloudData(
        data.next_candidates.map((item) => ({
          text: item.word,
          importance: item.probability * 100,
        }))
      );

      setHighlightedWord(targetWord);
    } catch (error) {
      console.error("Error generating next word:", error);
    }
  }, [currentIndex, currentText, fullTextArray, apiEndpoint]);

  const handleWordHighlightComplete = (word) => {
    setCurrentText((prev) => prev + " " + word);
    setCurrentIndex((prevIndex) => prevIndex + 1);
    setWordCloudData([]);
    setHighlightedWord("");

    if (currentIndex + 1 === fullTextArray.length) {
      setAutoAdvance(false);
      setIsCompleted(true);
    }
  };

  useEffect(() => {
    if (
      autoAdvance &&
      currentIndex < fullTextArray.length &&
      wordCloudData.length === 0
    ) {
      generateNextWord();
    }
  }, [currentIndex, autoAdvance, wordCloudData, fullTextArray.length, generateNextWord]);

  const startProcess = () => {
    setAutoAdvance(true);
    setIsCompleted(false);
    setCurrentText(fullTextArray[0]);
    setCurrentIndex(1);
  };

  const showEllipsis = currentIndex < fullTextArray.length;
  const displayedText = showEllipsis ? currentText + "..." : currentText;
  const words = displayedText.split(" ");
  const lastIndex = words.length - 1;

  const fadeStyle = `
    .redFade {
      animation: redToWhite 1.4s forwards;
    }
    @keyframes redToWhite {
      0%   { color: red;   }
      50%  { color: #faa;  }
      100% { color: white; }
    }
  `;

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <style>{fadeStyle}</style>

      {/* Облако слов */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <WordCloudD3
          words={wordCloudData}
          highlightedWord={highlightedWord}
          onWordHighlightComplete={handleWordHighlightComplete}
        />
      </div>

      {/* Текст */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 24px)",
            fontFamily: "Courier New",
            whiteSpace: "pre-wrap",
          }}
        >
          {words.map((w, i) => {
            const isLast = i === lastIndex;
            return (
              <span
                key={i}
                className={isLast && w !== "" ? "redFade" : ""}
                style={{
                  display: "inline-block",
                  marginLeft: i === 0 ? "0px" : "8px",
                }}
              >
                {w}
              </span>
            );
          })}
        </p>
      </div>

      {/* Кнопка */}
      <div style={{ textAlign: "center" }}>
        {!autoAdvance && (
          <button
            onClick={startProcess}
            disabled={autoAdvance}
            style={{
              padding: "10px 20px",
              fontSize: "clamp(12px, 1.5vw, 16px)",
              cursor: autoAdvance ? "not-allowed" : "pointer",
              borderRadius: "8px",
              background: "#fff",
              color: "#000",
              border: "none",
            }}
          >
            {isCompleted ? "Restart" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
