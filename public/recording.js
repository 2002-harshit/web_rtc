export default class Recorder {
  constructor(peerConnection) {
    this.peerConnection = peerConnection;
    this.streams = [];
    this.combinedStream = new MediaStream();
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.init();
  }

  init() {
    // this.peerConnection.getTransceivers().forEach(transceiver => {
    //   if (
    //     transceiver.receiver.track &&
    //     transceiver.receiver.track.kind === "audio"
    //   ) {
    //     this.combinedStream.addTrack(transceiver.receiver.track);
    //   }

    //   // Assuming you want to add only audio tracks, check if the sender's track is audio.
    //   // This check is necessary because a transceiver's sender may not always have a track (e.g., in "recvonly" or "inactive" modes).
    //   if (
    //     transceiver.sender.track &&
    //     transceiver.sender.track.kind === "audio"
    //   ) {
    //     this.combinedStream.addTrack(transceiver.sender.track);
    //   }
    // });

    this.peerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === "audio") {
        this.combinedStream.addTrack(sender.track);
      }
    });

    this.peerConnection.getReceivers().forEach(receiver => {
      if (receiver.track && receiver.track.kind === "audio") {
        this.combinedStream.addTrack(receiver.track);
      }
    });

    if (this.combinedStream.getTracks().length > 0) {
      this.mediaRecorder = new MediaRecorder(this.combinedStream, {
        mimeType: "audio/webm",
      });
      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = this.handleStop.bind(this);
    }
  }

  start() {
    if (this.mediaRecorder && this.mediaRecorder.state === "inactive") {
      this.recordedChunks = [];
      this.mediaRecorder.start();
      console.log("Recording started");
    }
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      console.log("Recording paused");
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      console.log("Recording stopped");
    }
  }

  handleStop() {
    const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    // Create an anchor (<a>) element
    const a = document.createElement("a");
    // Set the download attribute of the anchor to the desired file name
    a.download = "recording.webm";
    // Set the href of the anchor to the blob URL
    a.href = url;
    // Append the anchor to the body (required for Firefox)
    document.body.appendChild(a);
    // Trigger the download by simulating a click on the anchor
    a.click();
    // Clean up by revoking the blob URL and removing the anchor from the body
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
