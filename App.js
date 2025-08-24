import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Quiz from './Quiz';
import './App.css'; // typewriter + intro styles

const SERVER = process.env.REACT_APP_SERVER || 'http://localhost:4000';

function App(){
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [quizFinished, setQuizFinished] = useState(false);
  const [honourScore, setHonourScore] = useState(100);
  const [emotion, setEmotion] = useState("unknown");
  const [gaze, setGaze] = useState(null);

  useEffect(() => {
    if (!showIntro) {
      socketRef.current = io(SERVER);
      socketRef.current.on('connect', () => setConnected(true));

      socketRef.current.on('analysis', (data) => {
        console.log("Received from server:", data);

        // ⚠ Look-away
        if (data.look_away || data.face === false) {
          toast.warn('⚠️ You are looking away or no face detected!', { autoClose: 3000 });
          setHonourScore(prev => Math.max(0, prev - 3));
        }

        if (data.face && data.multi_face) {
          toast.warn('👥 Multiple faces detected! Only one user allowed.', { autoClose: 3000 });
          setHonourScore(prev => Math.max(0, prev - 3)); // optional heavier penalty
        }


        // ❌ No face detected
        // if (data.face === false) {
        //   toast.error('❌ No face detected! Please stay in view of the camera.', { autoClose: 3000 });
        //   setHonourScore(prev => Math.max(0, prev - 5));
        // }

        if (data.emotion) setEmotion(data.emotion);
        if (data.gaze) setGaze(data.gaze);
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [showIntro]);

  useEffect(() => {
    if (!showIntro && !quizFinished) {
      async function start() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play();
          const interval = setInterval(() => captureFrame(), 1000);
          return () => clearInterval(interval);
        } catch (err) {
          console.error('Error accessing webcam:', err);
          toast.error('Webcam access denied or not available.');
        }
      }
      start();
    }
  }, [showIntro, quizFinished]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    socketRef.current.emit('frame', { image: dataUrl });
  };

  const emotionColor = {
    happy: "#4CAF50",
    neutral: "#2196F3",
    sad: "#9C27B0",
    stressed: "#FF9800",
    surprised: "#f44336",
    unknown: "#757575"
  };

  if (showIntro) {
    return (
      <div className="intro-container">
        <h1 className="typewriter">Hackademia — AI Invigilation</h1>
        <p className="tagline">Stay focused and ace your quiz!</p>
        <button className="start-btn" onClick={() => setShowIntro(false)}>Start Quiz</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <header style={{
        background: '#2c2c2c',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ margin: 0 }}>Hackademia — AI Invigilation</h1>
        <span style={{
          padding: '5px 10px',
          borderRadius: '5px',
          background: connected ? '#4CAF50' : '#f44336',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        padding: '20px'
      }}>
        <Quiz onFinish={() => setQuizFinished(true)} honourScore={honourScore} />

        {!quizFinished && (
          <div style={{ position: "relative" }}>
            <video ref={videoRef} style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              border: '3px solid #2c2c2c'
            }} muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              background: emotionColor[emotion] || "#333",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "18px",
              fontWeight: "bold",
              textAlign: "center"
            }}>
              Emotion: {emotion} <br />
              {gaze ? `👀 Gaze → X: ${gaze.x.toFixed(2)}, Y: ${gaze.y.toFixed(2)}` : "👀 Gaze: --"}
            </div>
          </div>
        )}
      </div>

      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
