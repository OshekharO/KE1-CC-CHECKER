const checkBtn = document.getElementById("check-btn");
const aliNumbersDiv = document.getElementById("ali-numbers");
const muhammadNumbersDiv = document.getElementById("muhammad-numbers");
const muradNumbersDiv = document.getElementById("murad-numbers");
const stopCheckBtn = document.getElementById("stop-check-btn");

let updateNumbers;

checkBtn.addEventListener("click", function () {
  const numbers = document.getElementById("numbers").value;
  const numberArray = numbers.split("\n").filter((number) => {
    return number.trim() !== "";
  });

  aliNumbersDiv.innerHTML = "";
  muhammadNumbersDiv.innerHTML = "";
  muradNumbersDiv.innerHTML = "";

  checkBtn.classList.add("shake");
  setTimeout(() => {
    checkBtn.classList.remove("shake");
  }, 500);

  let aliList = [];
  let muhammadList = [];
  let muradList = [];

  for (let i = 0; i < numberArray.length; i++) {
    const number = numberArray[i].trim();
    const firstDigit = number.charAt(0);
    const secondDigit = number.charAt(1);
    const thirdDigit = number.charAt(2);

    const validPattern = /^\d{16}\|\s*\d{2}\|\s*\d{4}\|\s*\d{3}$|^\d{15}\|\s*\d{2}\|\s*\d{4}\|\s*\d{4}$|^\d{14}\|\s*\d{2}\|\s*\d{4}\|\s*\d{4}$/;
    if (!validPattern.test(number)) {
      continue;
    }

    const randomNumber = Math.random();
    const randomFour = Math.floor(Math.random() * 4);
    const randomTen = Math.floor(Math.random() * 10);
    const randomZero1 = Math.floor(Math.random() * 0);
    const randomZero2 = Math.floor(Math.random() * 0);

    if (randomNumber < 0.2) {
      aliList.push("<span style='color:green; font-weight:bold;'>Live</span> | " + number + " -> [Charge <span style='color:green; font-weight:bold;'>$" + randomFour + "," + randomTen + "</span>] [GATE:01]. /OshekherO");
    } else if (randomNumber < 0.9) {
      muhammadList.push("<span style='color:red; font-weight:bold;'>Dead</span> | " + number + " -> [Charge <span style='color:red; font-weight:bold;'>$" + randomZero1 + "," + randomZero2 + "</span>] [GATE:01]. /OshekherO");
    } else {
      muradList.push("<span style='color:orange; font-weight:bold;'>Unknown</span> | " + number + " -> [Charge <span style='color:orange; font-weight:bold;'>N/A</span>] [GATE:01]. /OshekherO");
    }
  }

  let aliCount = 0;
  let muhammadCount = 0;
  let muradCount = 0;
  const minDelay = 2000;
  const maxDelay = 5000;
  let i = 0;

  updateNumbers = setInterval(() => {
    if (i < aliList.length) {
      aliCount++;
      aliNumbersDiv.innerHTML += aliList[i] + "<br>";
      document.getElementById("ali-count").innerHTML = "Checked: " + aliCount;
    }
    if (i < muhammadList.length) {
      muhammadCount++;
      muhammadNumbersDiv.innerHTML += muhammadList[i] + "<br>";
      document.getElementById("muhammad-count").innerHTML = "Checked: " + muhammadCount;
    }
    if (i < muradList.length) {
      muradCount++;
      muradNumbersDiv.innerHTML += muradList[i] + "<br>";
      document.getElementById("murad-count").innerHTML = "Checked: " + muradCount;
    }
    i++;
    if (i >= aliList.length && i >= muhammadList.length && i >= muradList.length) {
      clearInterval(updateNumbers);
      Swal.fire({
        title: "Checking completed!",
        text: "All CC have been checked successfully.",
        icon: "success",
        confirmButtonText: "Okay",
      });
      checkBtn.disabled = false;
      stopCheckBtn.disabled = true;
      document.getElementById("numbers").value = "";
    }
  }, Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay));
});

// copy buttons
const copyButtons = document.querySelectorAll(".copy-btn");
copyButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const parentElement = button.parentElement;
    const text = parentElement.innerHTML.replace(/<\/?[^>]+(>|$)/g, "").trim();
    navigator.clipboard.writeText(text);
    button.classList.add("copied");
    const span = document.createElement("span");
    span.innerHTML = "Copied!";
    span.style.color = "green";
    span.style.marginLeft = "5px";
    button.parentNode.insertBefore(span, button.nextSibling);
    setTimeout(function () {
      button.classList.remove("copied");
      span.remove();
    }, 2000);
  });
});

// stop check button
stopCheckBtn.addEventListener("click", function () {
  clearInterval(updateNumbers);
  Swal.fire({
    title: "Checking stopped!",
    text: "The checking process has been stopped.",
    icon: "error",
    confirmButtonText: "Okay",
  });
  stopCheckBtn.disabled = true;
  checkBtn.disabled = false;
  stopCheckBtn.classList.add("shake");
  setTimeout(() => {
    stopCheckBtn.classList.remove("shake");
  }, 500);
});

// toggle buttons
function toggleButtons() {
  const checkBtn = document.getElementById("check-btn");
  const stopCheckBtn = document.getElementById("stop-check-btn");
  checkBtn.disabled = true;
  stopCheckBtn.disabled = false;
  stopCheckBtn.style.backgroundColor = "green";
}