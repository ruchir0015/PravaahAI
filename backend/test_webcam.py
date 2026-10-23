import cv2

for backend in (cv2.CAP_DSHOW, cv2.CAP_MSMF):
    for index in range(5):
        cap = cv2.VideoCapture(index, backend)

        if cap.isOpened():
            ret, frame = cap.read()

            if ret and frame is not None:
                print(
                    f"Backend={backend}, index={index}, "
                    f"size={frame.shape[1]}x{frame.shape[0]}"
                )
                cv2.imshow("Camera test", frame)
                cv2.waitKey(1500)
                cv2.destroyAllWindows()

        cap.release()