import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import debounce from "lodash/debounce"; // Correct lodash import

const NewPrompt = ({ data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [accumulatedText, setAccumulatedText] = useState(""); // New state for accumulated text
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  // Adjusting how the history is formatted
  const chat = model.startChat({
    history: Array.isArray(data?.history)
      ? data.history.map(({ role, parts }) => ({
          role,
          parts: parts.map((part) => ({ text: part.text })),
        }))
      : [],
    generationConfig: {
      // maxOutputTokens: 100,
    },
  });
  const endRef = useRef(null);
  const formRef = useRef(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.length ? question : undefined,
          answer,
          img: img.dbData?.filePath || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          formRef.current.reset();
          setQuestion("");
          setAnswer("");
          setImg({ isLoading: false, error: "", dbData: {}, aiData: {} });
        });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  // Debounced function to update the answer state more efficiently
  const updateAnswerDebounced = useRef(
    debounce((text) => setAnswer(text), 200)
  ).current;

  const add = async (text, isInitial) => {
    if (!isInitial) setQuestion(text);

    try {
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length ? [img.aiData, text] : [text]
      );
      let newText = "";

      // Set a timeout for stream completion
      const timeout = setTimeout(() => {
        if (!newText) {
          console.log("Stream timed out");
          mutation.mutate(); // Mutate even if the stream times out
        }
      }, 10000); // Set 10 seconds timeout

      // Process stream
      for await (const chunk of result.stream) {
        clearTimeout(timeout); // Clear timeout if chunk is received
        const chunkText = chunk.text();
        if (chunkText) {
          newText += chunkText;
          setAccumulatedText((prev) => prev + chunkText);
          updateAnswerDebounced(newText); // Debounced update
        }
      }

      mutation.mutate(); // Mutate once the stream ends
    } catch (err) {
      console.log("Error sending message:", err);
      // Retry logic in case of error
      setTimeout(() => add(text, isInitial), 2000); // Retry after 2 seconds
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text) return;
    add(text, false);
  };

  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      if (data?.history?.length === 1) {
        add(data.history[0].parts[0].text, true);
      }
    }
    hasRun.current = true;
  }, []);

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, question, answer, img.dbData]);

  return (
    <>
      {img.isLoading && <div className="">Loading...</div>}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
          path={img.dbData?.filePath}
          width="380"
          transformation={[{ width: 380 }]}
        />
      )}
      {question && <div className="message user">{question}</div>}
      {answer && (
        <div className="message">
          <Markdown>{answer}</Markdown>
        </div>
      )}
      <div className="endChat" ref={endRef}></div>
      <form className="newForm" onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg} />
        <input id="file" type="file" multiple={false} hidden />
        <input type="text" name="text" placeholder="Ask anything..." />
        <button>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  );
};

export default NewPrompt;
