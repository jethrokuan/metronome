const workercode = () => {
  var mytimer;

  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function(e) {
    console.log(e.data);
    if (e.data === "start") {
      mytimer = setInterval(function() {
        postMessage("tick");
      }, 25.0);
    }
    else if (e.data === "stop") {
      clearInterval(mytimer);
    } else {
      console.log("data");
    }
  };
};

let code = workercode.toString();
code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

console.log(code);
const blob = new Blob([code], { type: "application/javascript" });
const worker_script = URL.createObjectURL(blob);

export default worker_script;
