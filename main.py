import cv2
import base64
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
import mediapipe as mp
import time
import dlib
from imutils import face_utils

app = FastAPI()

# ---------------- Mediapipe setup ----------------
mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,  # keep single face in mind
    refine_landmarks=True,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

# ---------------- Dlib setup ----------------
predictor_path = "shape_predictor_68_face_landmarks.dat"
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(predictor_path)

# ---------------- Look-away settings ----------------
LOOKAWAY_THRESHOLD = 0.3   # faster detection
lookaway_count = 0
lookaway_start = None

# ---------------- Temporal buffer ----------------
landmark_history = []
HISTORY_SIZE = 5  # smaller buffer for faster response

class FrameIn(BaseModel):
    image_b64: str

@app.post('/analyze')
async def analyze(frame: FrameIn):
    global lookaway_count, lookaway_start, landmark_history
    try:
        # Decode base64 → OpenCV image
        b = base64.b64decode(frame.image_b64.split(',')[-1])
        arr = np.frombuffer(b, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"face": False, "look_away": True, "emotion": "unknown", "timestamp": time.time()}

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)
        now = time.time()

        response = {
            'face': False,
            'look_away': False,
            'emotion': 'unknown',
            'timestamp': now,
            'gaze': None
        }

        # ---------------- Mediapipe: Face landmarks ----------------
        head_away = False
        num_faces_detected = len(results.multi_face_landmarks) if results.multi_face_landmarks else 0

        if num_faces_detected == 1:
            response['face'] = True
            lm = results.multi_face_landmarks[0].landmark

            # Eye corners for head center
            left = lm[33]
            right = lm[263]
            mid_x = (left.x + right.x) / 2
            mid_y = (left.y + right.y) / 2

            # Head tilt angle
            dx = right.x - left.x
            dy = right.y - left.y
            angle = np.arctan2(dy, dx) * 180 / np.pi

            # Head look-away detection (tighter thresholds)
            horizontal_away = mid_x < 0.43 or mid_x > 0.57
            vertical_away = mid_y < 0.43 or mid_y > 0.57
            tilt_away = abs(angle) > 9


            head_away = horizontal_away or vertical_away or tilt_away

            if head_away:
                if lookaway_start is None:
                    lookaway_start = now
                elif now - lookaway_start >= LOOKAWAY_THRESHOLD:
                    lookaway_count += 1
                    response['look_away'] = True
            else:
                lookaway_count = 0
                lookaway_start = None

            # Emotion: simple happy vs neutral
            mouth_left = lm[61]
            mouth_right = lm[291]
            mouth_width = abs(mouth_right.x - mouth_left.x)
            face_width = abs(right.x - left.x)

            response['emotion'] = "happy" if mouth_width / face_width > 0.45 else "neutral"

        elif num_faces_detected > 1:
            response['face'] = True
            response['look_away'] = True  # multiple faces detected → warning
        else:
            response['face'] = False
            response['look_away'] = True  # no face → warning

        # ---------------- Dlib: gaze ----------------
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = detector(gray, 0)
        gaze_away = False

        if len(faces) == 1:
            shape = predictor(gray, faces[0])
            shape = face_utils.shape_to_np(shape)

            left_eye = shape[36:42]
            right_eye = shape[42:48]
            left_center = np.mean(left_eye, axis=0).astype(int)
            right_center = np.mean(right_eye, axis=0).astype(int)

            gaze_x = (left_center[0] + right_center[0]) / 2 / img.shape[1]
            gaze_y = (left_center[1] + right_center[1]) / 2 / img.shape[0]
            response['gaze'] = {"x": float(gaze_x), "y": float(gaze_y)}

            # Update history
            landmark_history.append((now, gaze_x, gaze_y))
            if len(landmark_history) > HISTORY_SIZE:
                landmark_history.pop(0)

            if len(landmark_history) >= HISTORY_SIZE:
                avg_gaze_x = np.mean([h[1] for h in landmark_history])
                avg_gaze_y = np.mean([h[2] for h in landmark_history])
                gaze_away = avg_gaze_x < 0.43 or avg_gaze_x > 0.57 or avg_gaze_y < 0.43 or avg_gaze_y > 0.57


        elif len(faces) != 1:
            gaze_away = True  # multiple faces → warning

        # ---------------- Combine head + gaze ----------------
        if head_away or gaze_away:
            response['look_away'] = True

        print(f"[LOG] {now:.2f} | Faces:{num_faces_detected} | Face:{response['face']} | "
              f"LookAway:{response['look_away']} | Gaze:{response['gaze']} | Emotion:{response['emotion']} | Tilt:{angle if num_faces_detected == 1 else 'N/A'}")

        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': str(e) if str(e) else "Unknown error"}
