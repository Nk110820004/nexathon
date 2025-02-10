import cv2
import numpy as np
import time
import PoseModule as pm

from flask import Flask #you have installed flask already, you need to install flask-login, flask-sqlalchemy and other modules.

cap = cv2.VideoCapture(r"C:\Users\svsiv\OneDrive\Desktop\Nexathon - Working Progress\ML model\PoseVideos\curls.mp4")  # r prefix is used to process the file address as a raw string, done because i was getting Syntax Error: unicode error

detector = pm.poseDetector()


while True:
    #success, img = cap.read()
    #img = cv2.resize(img, (1280,720))

    img = cv2.imread(r"C:\Users\svsiv\OneDrive\Desktop\Nexathon - Working Progress\ML model\PoseVideos\test.jpg")
    img = detector.findPose(img)

    lmList = detector.findPosition(img, False)
    print(lmList)
    if len(lmList) != 0:
         pass

    cv2.imshow("Image", img)
    cv2.waitKey(1)

