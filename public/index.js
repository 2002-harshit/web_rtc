/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";

import Recorder from "./recording.js";

let localStream = null;
let peerConnection = null;
const registerButton = document.getElementById("register");
const startButton = document.getElementById("startButton");
const hangUpButton = document.getElementById("hangUpButton");
const senderField = document.querySelector(`[name="unique_sender_name"]`);
const receiverField = document.querySelector(`[name="unique_receiver_name"]`);
const pauseButton = document.getElementById("pauseButton");
const startRecordButton = document.getElementById("startRecordButton");
const pauseRecordButton = document.getElementById("pauseRecordButton");
const stopRecordButton = document.getElementById("stopRecordButton");
let audioBufferCache = null;
let audioContext = null;
const filePath = "lovex27s-serenade-valentines-day-188266.mp3";
let recorder = null;

// const musicAudio = document.getElementById("musicAudio");
let isPaused = false;
let originalTrack = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let ws = new WebSocket("wss://192.168.1.209:3000");

ws.onerror = () => {
  alert("Some error with signalling server");
};

ws.onopen = async () => {
  try {
    alert("Client connected to signalling server");

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
      const remoteAudio = document.getElementById("remoteAudio");
      if (remoteAudio.srcObject !== event.streams[0]) {
        remoteAudio.srcObject = event.streams[0];
      }
    };

    registerButton.disabled = false;
  } catch (err) {
    console.error(err);
    alert("Could not access the microphone. Check permissions.");
  }
};

ws.onmessage = msg => {
  let data = JSON.parse(msg.data);

  console.log(data);

  try {
    switch (data.type) {
      case "offer":
        peerConnection
          .setRemoteDescription(data.offer)
          .then(() => {
            console.log(`Offer arrived from ${data.name}`);
            return peerConnection.createAnswer();
          })
          .then(answer => {
            peerConnection.setLocalDescription(answer);
            console.log("Answer created");
            ws.send(
              JSON.stringify({
                type: "answer",
                answer,
                name: senderField.value,
                target: data.name,
              })
            );
            console.log(`Answer sent to ${data.name}`);
          });
        break;
      case "answer":
        peerConnection
          .setRemoteDescription(new RTCSessionDescription(data.answer))
          .then(() => {
            console.log(`Answer received from ${data.name}`);
          });
        break;
      case "candidate":
        if (data.candidate) {
          peerConnection
            .addIceCandidate(new RTCIceCandidate(data.candidate))
            .then(() => {
              console.log(`Candidate arrived from ${data.name}`);
            });
        }
        break;
      case "error":
        console.error("Error from server: ", data.message);
        alert(`Error: ${data.message}`);
        break;
      case "register":
        if (data.success) {
          registerButton.disabled = true;
          senderField.readOnly = true;
          startButton.disabled = false;
        }
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Some error ${err}`);
  }
};

registerButton.addEventListener("click", event => {
  if (senderField.value === "") {
    alert("Enter the sender's name");
    return;
  }

  ws.send(
    JSON.stringify({
      type: "register",
      name: senderField.value,
    })
  );
});

startButton.addEventListener("click", async event => {
  try {
    if (receiverField.value === "") {
      alert("Enter the receiver's name");
      return;
    }

    // localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // peerConnection = new RTCPeerConnection(configuration);

    // localStream.getTracks().forEach(track => {
    //   peerConnection.addTrack(track, localStream);
    // });

    // if (localStream) {
    //   const audioTracks = localStream.getAudioTracks();
    //   if (audioTracks.length > 0) {
    //     console.log(`Using Audio track: ${audioTracks[0].label}`);
    //   }
    // }

    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer).then(() => {
        ws.send(
          JSON.stringify({
            type: "offer",
            offer,
            name: senderField.value,
            target: receiverField.value,
          })
        );
        // console.log(`Offer sent to ${receiver}`);
      });
    });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            name: senderField.value,
            target: receiverField.value,
          })
        );
        console.log(`Candidate sent to ${receiverField.value}`);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        document.getElementById("status").textContent = "Connected";
        console.log(`Peers connected`);
      }
    };

    // peerConnection.ontrack = event => {
    //   const remoteAudio = document.getElementById("remoteAudio");
    //   if (remoteAudio.srcObject !== event.streams[0]) {
    //     remoteAudio.srcObject = event.streams[0];
    //   }
    // };

    startButton.disabled = true;
    hangUpButton.disabled = false;
    pauseButton.hidden = false;

    recorder = new Recorder(peerConnection);
  } catch (error) {
    alert(error);
  }
});

document.getElementById("hangUpButton").addEventListener("click", () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // Reset the audio elements
  // document.getElementById("localAudio").srcObject = null;
  document.getElementById("remoteAudio").srcObject = null;

  // Disable the Hang-Up button
  hangUpButton.disabled = true;
  startButton.disabled = false;
  pauseButton.hidden = true;
  //   registerButton.disabled = false;
  document.getElementById("status").textContent = "Not Connected";
});

pauseButton.addEventListener("click", async () => {
  if (isPaused) {
    await switchToLiveAudio();
    pauseButton.textContent = "Pause";
  } else {
    await switchToMusic();
    pauseButton.textContent = "Resume";
  }

  isPaused = !isPaused;
});

async function switchToLiveAudio() {
  if (originalTrack) {
    originalTrack.enabled = true;
    replaceTrackInPeerConnection(originalTrack);
  } else {
    alert("fatal no original track for switching back");
  }

  // musicAudio.pause();
  // musicAudio.currentTime = 0;
}

// async function switchToMusic() {
//   if (!originalTrack) {
//     originalTrack = localStream.getAudioTracks()[0];
//     // console.log(originalTrack);
//   }

//   originalTrack.enabled = false;
//   // musicAudio.muted = true;
//   // musicAudio.volume = 0;
//   musicAudio.play();

//   let musicStream = musicAudio.captureStream();
//   let musicTrack = musicStream.getAudioTracks()[0];
//   replaceTrackInPeerConnection(musicTrack);
// }
async function switchToMusic() {
  if (!originalTrack) {
    originalTrack = localStream.getAudioTracks()[0];
  }

  // Disable the original live audio track
  originalTrack.enabled = false;

  try {
    // const audioContext = new (window.AudioContext ||
    //   window.webkitAudioContext)();
    // const response = await fetch("lovex27s-serenade-valentines-day-188266.mp3");
    // const arrayBuffer = await response.arrayBuffer();
    // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioBuffer = await fetchAndDecodeAudio(audioContext, filePath);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create a MediaStreamAudioDestinationNode to capture the output
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    source.start(0); // Start the source

    // Use the stream from the MediaStreamAudioDestinationNode for the WebRTC connection
    const musicStream = destination.stream;
    const musicTrack = musicStream.getAudioTracks()[0];
    replaceTrackInPeerConnection(musicTrack);
  } catch (err) {
    alert(`Error in music playing {err}`);
  }
}

function replaceTrackInPeerConnection(newTrack) {
  let audioSender = peerConnection
    .getSenders()
    .find(sender => sender.track && sender.track.kind === "audio");

  if (audioSender) {
    audioSender.replaceTrack(newTrack);
  }
}

async function fetchAndDecodeAudio(audioContext, audioFilePath) {
  if (audioBufferCache) {
    // Return the cached AudioBuffer if it's already been fetched and decoded
    return audioBufferCache;
  }

  // Fetch and decode the audio file
  const response = await fetch(audioFilePath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Cache the AudioBuffer for future use
  audioBufferCache = audioBuffer;

  return audioBuffer;
}

startRecordButton.addEventListener("click", function () {
  recorder.start();
});
pauseRecordButton.addEventListener("click", function () {
  recorder.pause();
});
stopRecordButton.addEventListener("click", function () {
  recorder.stop();
});
