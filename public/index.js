let localStream = null;
let peerConnection = null;
let sender = null;
let receiver = null;
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
let ws = new WebSocket("wss://192.168.1.209:3000");

ws.onopen = async () => {
  alert("Client connected to signalling server");
  peerConnection = new RTCPeerConnection(configuration);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    const remoteAudio = document.getElementById("remoteAudio");
    if (remoteAudio.srcObject !== event.streams[0]) {
      remoteAudio.srcObject = event.streams[0];
    }
  };
  document.getElementById("startButton").disabled = false;
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
                name: sender,
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
      default:
        break;
    }
  } catch (er) {
    console.error(`Some error with websocket reeceving message ${er}`);
  }
};

document.getElementById("register").addEventListener("click", event => {
  sender = document.querySelector(`[name="unique_sender_name"]`).value;

  if (sender === "") {
    alert("Enter the sender's name");
    return;
  }

  ws.send(
    JSON.stringify({
      type: "register",
      name: sender,
    })
  );

  alert(`${sender} registered`);
  event.target.disabled = true;
});

document
  .getElementById("startButton")
  .addEventListener("click", async event => {
    try {
      receiver = document.querySelector(`[name="unique_receiver_name"]`).value;

      if (receiver === "") {
        alert("Enter the receiver's name");
        return;
      }

      peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer).then(() => {
          ws.send(
            JSON.stringify({
              type: "offer",
              offer,
              name: sender,
              target: receiver,
            })
          );
          console.log(`Offer sent to ${receiver}`);
        });
      });

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          ws.send(
            JSON.stringify({
              type: "candidate",
              candidate: event.candidate,
              name: sender,
              target: receiver,
            })
          );
          console.log(`Candidate sent to ${receiver}`);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          document.getElementById("status").textContent = "Connected";
          console.log(`${sender}Peers connected`);
        }
      };

      event.target.disabled = true;
      document.getElementById("hangUpButton").disabled = false;
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
  document.getElementById("localAudio").srcObject = null;
  document.getElementById("remoteAudio").srcObject = null;

  // Disable the Hang Up button
  document.getElementById("hangUpButton").disabled = true;
  document.getElementById("startButton").disabled = false;
  document.getElementById("status").textContent = "Not Connected";
});
