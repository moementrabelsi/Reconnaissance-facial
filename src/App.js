import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const imageRef = useRef();
  const canvasRef = useRef();
  const isFirstRender = useRef(true);
  const [image, setImage] = useState();
  const [distance, setDistance] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [extractedFaces, setExtractedFaces] = useState([]);

  const renderFaces = (image, detections) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    detections.forEach((detection, index) => {
      const { x, y, width, height } = detection.detection.box;
      context.strokeStyle = "#00FF00";
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);
    });
  };

  const extractFaces = async () => {
    const faces = [];
    if (detectedFaces.length > 0) {
      for (const detection of detectedFaces) {
        if (detection.detection && detection.detection.box) {
          const faceCanvas = document.createElement("canvas");
          faceCanvas.width = detection.detection.box.width;
          faceCanvas.height = detection.detection.box.height;
          const faceContext = faceCanvas.getContext("2d");
          faceContext.drawImage(imageRef.current,
            detection.detection.box.x, detection.detection.box.y,
            detection.detection.box.width, detection.detection.box.height,
            0, 0, faceCanvas.width, faceCanvas.height);
          faces.push(faceCanvas.toDataURL("image/png"));
        }
      }
    }
    return faces;
  };

  const check = async () => {
    setStatus(null);
    setLoading(true);
    setDistance(null);
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');

    const detections = await faceapi.detectAllFaces(imageRef.current,
      new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceDescriptors();

    setDetectedFaces(detections);
    renderFaces(imageRef.current, detections);

    if (detections.length >= 2) {
      const idCardFacedetection = detections[0];
      const selfieFacedetection = detections[1];
      const distance = faceapi.euclideanDistance(idCardFacedetection.descriptor, selfieFacedetection.descriptor);
      setDistance(distance);
      if (distance < 0.6) {
        setStatus("Matched");
      } else {
        setStatus("Not Matched");
      }
    }  

    setLoading(false);

  };

  const handleImageChange = (event) => {
    const selectedImage = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(selectedImage);
  };

  const init = () => {
    setDistance(null);
    setImage();
    setDetectedFaces([]);
    setExtractedFaces([]);
    setStatus(null);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
  }, []);

  useEffect(() => {
    async function extractAndSetFaces() {
      if (detectedFaces.length > 0 && image) {
        const extractedFaces = await extractFaces();
        setExtractedFaces(extractedFaces);
      }
    }
    extractAndSetFaces();
  }, [detectedFaces, image]);

  return (
    <>
      <div className="gallery-container">
        <div className="gallery">
          {image ? (
            <>
              <img ref={imageRef} src={image} alt="Image" style={{ maxWidth: 'full' }} />
              <canvas ref={canvasRef} width={imageRef.current ? imageRef.current.width : 0} height={imageRef.current ? imageRef.current.height : 0}></canvas>
            </>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          )}
        </div>
        <div className="detected-faces">
          {detectedFaces.map((face, index) => (
            <div key={index}>
              {/* <img src={face} alt={`Face ${index + 1}`} style={{ maxWidth: '100px' }} /> */}
            </div>
          ))}
        </div>
        <div className="extracted-faces">
          {extractedFaces.map((face, index) => (
            <div key={index}>
              <img src={face} alt={`Extracted Face ${index + 1}`} style={{ maxWidth: '100px' }} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={check}>
        Check
      </button>
      {loading && (<p>Calculating...</p>)}
      <button onClick={init}>
        Initialize
      </button>
      {distance !== null && <p>Distance: {distance}</p>}
      {status !== null && <p>Status: {status === "Matched" ? "Matched" : "Not Matched"}</p>}
    </>
  );
}

export default App;
