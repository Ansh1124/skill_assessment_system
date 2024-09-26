import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const FaceLandmarkerComponent = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const [isLookingAtScreen, setLookingAtScreen] = useState(false);

  const drawPoints = true;

  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 1, // Set to detect one face
      });

      faceLandmarkerRef.current = faceLandmarker;
      startCamera(); // Start the camera after initializing the landmarker
    };

    const startCamera = async () => {
      const videoElement = videoRef.current;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user',
          },
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play();
        };
      } catch (error) {
        console.error("Error accessing the webcam: ", error);
      }
    };

    const detectFaceLandmarks = async () => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext('2d');

      const updateLandmarks = () => {
        if (faceLandmarkerRef.current && videoElement.readyState >= 2) {
          const results = faceLandmarkerRef.current.detectForVideo(videoElement, performance.now());

          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

          if (results.faceLandmarks) {
            console.log('Face Landmarks:', results.faceLandmarks);
            results.faceLandmarks.forEach((landmarks) => {
              const leftEye = landmarks[145]; // Left eye landmark
              const rightEye = landmarks[374]; // Right eye landmark
              const nose = landmarks[1]; // Nose tip landmark
              const mouthLeft = landmarks[61]; // Left mouth corner
              const mouthRight = landmarks[291]; // Right mouth corner

              // Draw landmarks on canvas
              if (drawPoints) drawLandmarks(canvasCtx, landmarks);

              // Calculate head pose
              const headPose = calculateHeadPose(leftEye, rightEye, nose, mouthLeft, mouthRight);
              console.log('Head Pose:', headPose);

              // Check if user is looking at the screen
              if (Math.abs(headPose.yaw) < 10) { // Change threshold as needed
                setLookingAtScreen(true);
                console.log('User is looking at the screen');
              } else {
                setLookingAtScreen(false);
                console.log('User is not looking at the screen');
              }
            });
          }
        }
        requestAnimationFrame(updateLandmarks);
      };
      updateLandmarks();
    };

    const drawLandmarks = (ctx, landmarks) => {
      console.log("Drawing landmarks");
      ctx.beginPath();
      ctx.strokeStyle = 'red';
      landmarks.forEach((point) => {
        ctx.arc(point.x * canvasRef.current.width, point.y * canvasRef.current.height, 2, 0, 2 * Math.PI);
      });
      ctx.stroke();
    };

    const calculateHeadPose = (leftEye, rightEye, nose, mouthLeft, mouthRight) => {
        // Get coordinates
        const leftX = leftEye.x;
        const rightX = rightEye.x;
        const noseX = nose.x;
        const leftMouthX = mouthLeft.x;
        const rightMouthX = mouthRight.x;
      
        // Calculate midpoints for mouth
        const mouthMidpointX = (leftMouthX + rightMouthX) / 2;
      
        // Calculate yaw using the horizontal positions
        const yaw = Math.atan2(noseX - mouthMidpointX, rightX - leftX) * (180 / Math.PI);
      
        return { yaw };
      };
      

    initializeFaceLandmarker().then(() => {
      detectFaceLandmarks(); // Start detecting landmarks after initialization
    });

  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        width="640"
        height="480"
        autoPlay
        playsInline
        muted
        style={{ display: 'none', border: '1px solid black' }}
      />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{
          border: `100px solid ${isLookingAtScreen ? 'green' : 'red'}`,  // dynamic border color
          backgroundColor: isLookingAtScreen ? 'lightgreen' : 'lightcoral', // dynamic background color
          opacity: isLookingAtScreen ? 1 : 0.5 // dynamic opacity
        }}
      />
    </div>
  );
};

export default FaceLandmarkerComponent;
