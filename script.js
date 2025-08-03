      class CCValidator {
        constructor() {
          this.cardPatterns = {
            visa: {
              pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
              cvvLength: [3],
            },
            mastercard: {
              pattern: /^5[1-5][0-9]{14}$/,
              cvvLength: [3],
            },
            amex: {
              pattern: /^3[47][0-9]{13}$/,
              cvvLength: [4],
            },
            discover: {
              pattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
              cvvLength: [3],
            },
            diners: {
              pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
              cvvLength: [3],
            },
            jcb: {
              pattern: /^(?:2131|1800|35\d{3})\d{11}$/,
              cvvLength: [3],
            },
          };
          this.isProcessing = false;
          this.currentBatch = null;
        }

        extractCardData(cardData) {
          const parts = cardData.split("|").map((part) => part.trim());
          return {
            number: parts[0] || "",
            month: parts[1] || "",
            year: parts[2] || "",
            cvv: parts[3] || "",
          };
        }

        luhnCheck(cardNumber) {
          const cleaned = cardNumber.replace(/\D/g, "");
          if (cleaned.length < 13 || cleaned.length > 19) return false;

          let sum = 0;
          let shouldDouble = false;

          for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i), 10);

            if (shouldDouble) {
              digit *= 2;
              if (digit > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
          }

          return sum % 10 === 0;
        }

        validateExpiration(month, year) {
          if (!month || !year) return false;
          if (month.length !== 2) return false;

          const mm = parseInt(month, 10);
          if (mm < 1 || mm > 12) return false;

          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;

          let fullYear = parseInt(year, 10);
          if (year.length === 2) {
            fullYear = 2000 + fullYear;
          } else if (year.length !== 4) {
            return false;
          }

          if (fullYear < currentYear) return false;
          if (fullYear === currentYear && mm < currentMonth) return false;

          return true;
        }

        validateCVV(cvv, cardType) {
          if (!cvv) return false;
          const typeInfo = this.cardPatterns[cardType] || { cvvLength: [3] };
          return typeInfo.cvvLength.includes(cvv.length) && /^\d+$/.test(cvv);
        }

        validateCard(cardData) {
          const { number, month, year, cvv } = this.extractCardData(cardData);

          if (!number) return { valid: false, reason: "Missing card number" };

          const cleanedNumber = number.replace(/\D/g, "");
          const type = Object.entries(this.cardPatterns).find(([_, info]) => info.pattern.test(cleanedNumber))?.[0] || "unknown";

          if (!this.luhnCheck(cleanedNumber)) {
            return { valid: false, type, reason: "Failed Luhn check" };
          }

          if (!this.validateExpiration(month, year)) {
            return { valid: false, type, reason: "Invalid expiration date" };
          }

          if (!this.validateCVV(cvv, type)) {
            return { valid: false, type, reason: "Invalid CVV" };
          }

          return { valid: true, type };
        }

        simulateStatus() {
          const random = Math.random();
          if (random < 0.2) return "LIVE";
          return "DEAD";
        }

        async processBatch(cardsData, progressCallback, resultCallback) {
          if (this.isProcessing) return;

          this.isProcessing = true;
          this.currentBatch = {
            total: cardsData.length,
            processed: 0,
            valid: 0,
            live: 0,
            dead: 0,
          };

          for (let i = 0; i < cardsData.length; i++) {
            if (!this.isProcessing) break;

            const cardData = cardsData[i].trim();
            if (!cardData) continue;

            const validation = this.validateCard(cardData);
            let status = "INVALID";

            if (validation.valid) {
              status = this.simulateStatus();
              this.currentBatch.valid++;

              if (status === "LIVE") this.currentBatch.live++;
              else this.currentBatch.dead++;
            }

            this.currentBatch.processed++;
            const progress = Math.floor((this.currentBatch.processed / this.currentBatch.total) * 100);

            if (status === "LIVE" || status === "DEAD") {
              resultCallback({
                cardData,
                ...validation,
                status,
                progress,
              });
            }

            progressCallback(this.currentBatch);

            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          this.isProcessing = false;
          return this.currentBatch;
        }

        stopProcessing() {
          this.isProcessing = false;
        }
      }

      document.addEventListener("DOMContentLoaded", () => {
        const validator = new CCValidator();
        const cardInput = document.getElementById("card-input");
        const validateBtn = document.getElementById("validate-btn");
        const stopBtn = document.getElementById("stop-btn");
        const clearBtn = document.getElementById("clear-btn");
        const themeToggle = document.getElementById("theme-toggle");
        const progressBar = document.getElementById("progress-bar");
        const resultsContainer = document.getElementById("results-container");
        const counters = {
          total: document.getElementById("total-count"),
          valid: document.getElementById("valid-count"),
          live: document.getElementById("live-count"),
          dead: document.getElementById("dead-count"),
        };

        function toggleTheme() {
          const currentTheme = document.documentElement.getAttribute("data-theme");
          const newTheme = currentTheme === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", newTheme);
          localStorage.setItem("theme", newTheme);
          themeToggle.textContent = newTheme === "dark" ? "Toggle Light Mode" : "Toggle Dark Mode";
        }

        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        themeToggle.textContent = savedTheme === "dark" ? "Toggle Light Mode" : "Toggle Dark Mode";
        themeToggle.addEventListener("click", toggleTheme);

        function updateCounters(stats) {
          counters.total.textContent = stats.total;
          counters.valid.textContent = stats.valid;
          counters.live.textContent = stats.live;
          counters.dead.textContent = stats.dead;
        }

        function addResultToUI(result) {
          const cardElement = document.createElement("div");
          cardElement.className = `result-card ${result.status.toLowerCase()}`;

          const { number, month, year, cvv } = validator.extractCardData(result.cardData);

          cardElement.innerHTML = `
          <div class="card-number">${number}</div>
          <div class="card-details">
            <span>Exp: ${month}/${year.length === 2 ? "20" + year : year}</span>
            <span>CVV: ${cvv}</span>
            <span class="card-type">${result.type.toUpperCase()}</span>
          </div>
          <div class="status">${result.status}</div>
          ${result.reason ? `<div class="reason">${result.reason}</div>` : ""}
        `;

          resultsContainer.prepend(cardElement);
        }

        validateBtn.addEventListener("click", async () => {
          const cardsData = cardInput.value.split("\n").filter((line) => line.trim());
          if (cardsData.length === 0) return;

          validateBtn.disabled = true;
          stopBtn.disabled = false;
          resultsContainer.innerHTML = "";

          await validator.processBatch(
            cardsData,
            (stats) => {
              updateCounters(stats);
            },
            (result) => {
              progressBar.style.width = `${result.progress}%`;
              addResultToUI(result);
            }
          );

          validateBtn.disabled = false;
          stopBtn.disabled = true;
        });

        stopBtn.addEventListener("click", () => {
          validator.stopProcessing();
          stopBtn.disabled = true;
          validateBtn.disabled = false;
        });

        clearBtn.addEventListener("click", () => {
          cardInput.value = "";
          resultsContainer.innerHTML = "";
          progressBar.style.width = "0%";
          Object.values(counters).forEach((counter) => (counter.textContent = "0"));
        });

        const structuredData = {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Advanced Credit Card Validator",
          description: "Validate credit card numbers using Luhn algorithm with expiration date and CVV verification",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        };

        const scriptTag = document.createElement("script");
        scriptTag.type = "application/ld+json";
        scriptTag.text = JSON.stringify(structuredData);
        document.head.appendChild(scriptTag);
      });
