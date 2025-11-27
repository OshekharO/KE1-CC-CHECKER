/**
 * Credit Card Validator Class
 * Implements comprehensive validation using Luhn algorithm and BIN/IIN detection
 */

// Processing delay in milliseconds for UI responsiveness
const PROCESSING_DELAY_MS = 80;

class CCValidator {
  constructor() {
    // Card patterns with BIN ranges and issuer-specific validation rules
    this.cardPatterns = {
      visa: {
        pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
        binRanges: [[4, 4]],
        lengths: [13, 16, 19],
        cvvLength: [3],
        name: "Visa"
      },
      mastercard: {
        pattern: /^(5[1-5][0-9]{14}|2(2[2-9][0-9]|[3-6][0-9]{2}|7[01][0-9]|720)[0-9]{12})$/,
        binRanges: [[51, 55], [2221, 2720]],
        lengths: [16],
        cvvLength: [3],
        name: "Mastercard"
      },
      amex: {
        pattern: /^3[47][0-9]{13}$/,
        binRanges: [[34, 34], [37, 37]],
        lengths: [15],
        cvvLength: [4],
        name: "American Express"
      },
      discover: {
        pattern: /^6(?:011|4[4-9][0-9]|5[0-9]{2})[0-9]{12}$/,
        binRanges: [[6011, 6011], [644, 649], [65, 65]],
        lengths: [16, 17, 18, 19],
        cvvLength: [3],
        name: "Discover"
      },
      diners: {
        pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11,13}$/,
        binRanges: [[300, 305], [36, 36], [38, 39]],
        lengths: [14, 15, 16],
        cvvLength: [3],
        name: "Diners Club"
      },
      jcb: {
        pattern: /^(?:2131|1800|35[0-9]{3})[0-9]{11,13}$/,
        binRanges: [[3528, 3589], [2131, 2131], [1800, 1800]],
        lengths: [15, 16, 17, 18, 19],
        cvvLength: [3],
        name: "JCB"
      },
      unionpay: {
        pattern: /^62[0-9]{14,17}$/,
        binRanges: [[62, 62]],
        lengths: [16, 17, 18, 19],
        cvvLength: [3],
        name: "UnionPay"
      },
      maestro: {
        pattern: /^(5018|5020|5038|5893|6304|6759|676[1-3])[0-9]{8,15}$/,
        binRanges: [[5018, 5018], [5020, 5020], [5038, 5038], [6304, 6304], [6759, 6759]],
        lengths: [12, 13, 14, 15, 16, 17, 18, 19],
        cvvLength: [3],
        name: "Maestro"
      }
    };

    this.isProcessing = false;
    this.currentBatch = null;
  }

  /**
   * Extract card data from pipe-delimited string
   * @param {string} cardData - Card data in format: number|month|year|cvv
   * @returns {Object} Extracted card components
   */
  extractCardData(cardData) {
    const parts = cardData.split("|").map(part => part.trim());
    return {
      number: parts[0] || "",
      month: parts[1] || "",
      year: parts[2] || "",
      cvv: parts[3] || ""
    };
  }

  /**
   * Clean card number by removing non-digit characters
   * @param {string} cardNumber - Raw card number
   * @returns {string} Cleaned card number with only digits
   */
  cleanCardNumber(cardNumber) {
    return cardNumber.replace(/\D/g, "");
  }

  /**
   * Validate card number length
   * @param {string} cardNumber - Cleaned card number
   * @returns {boolean} True if length is valid
   */
  validateLength(cardNumber) {
    const length = cardNumber.length;
    return length >= 12 && length <= 19;
  }

  /**
   * Luhn algorithm (Mod 10) for card number validation
   * Enhanced implementation with better performance
   * @param {string} cardNumber - Cleaned card number
   * @returns {boolean} True if checksum is valid
   */
  luhnCheck(cardNumber) {
    const digits = cardNumber.split("").map(Number);
    const length = digits.length;

    if (length < 12 || length > 19) return false;

    let sum = 0;
    let isSecond = false;

    // Process from right to left
    for (let i = length - 1; i >= 0; i--) {
      let digit = digits[i];

      if (isSecond) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isSecond = !isSecond;
    }

    return sum % 10 === 0;
  }

  /**
   * Detect card type based on BIN/IIN ranges
   * @param {string} cardNumber - Cleaned card number
   * @returns {Object} Card type info or unknown
   */
  detectCardType(cardNumber) {
    for (const [type, info] of Object.entries(this.cardPatterns)) {
      if (info.pattern.test(cardNumber)) {
        return { type, ...info };
      }
    }
    return { type: "unknown", name: "Unknown", cvvLength: [3] };
  }

  /**
   * Validate BIN/IIN prefix against known ranges
   * @param {string} cardNumber - Cleaned card number
   * @param {Object} cardInfo - Card type info with BIN ranges
   * @returns {boolean} True if BIN is valid
   */
  validateBIN(cardNumber, cardInfo) {
    if (!cardInfo.binRanges) return true;

    for (const [start, end] of cardInfo.binRanges) {
      const prefixLength = String(start).length;
      const prefix = parseInt(cardNumber.substring(0, prefixLength), 10);
      if (prefix >= start && prefix <= end) return true;
    }
    return false;
  }

  /**
   * Validate expiration date with comprehensive checks
   * @param {string} month - Month (MM format)
   * @param {string} year - Year (YY or YYYY format)
   * @returns {Object} Validation result with details
   */
  validateExpiration(month, year) {
    if (!month || !year) {
      return { valid: false, reason: "Missing date components" };
    }

    // Normalize month
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, reason: "Invalid month" };
    }

    // Normalize year
    let fullYear = parseInt(year, 10);
    if (isNaN(fullYear)) {
      return { valid: false, reason: "Invalid year format" };
    }

    if (year.length === 2) {
      fullYear = 2000 + fullYear;
    } else if (year.length !== 4) {
      return { valid: false, reason: "Year must be 2 or 4 digits" };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Card expired
    if (fullYear < currentYear) {
      return { valid: false, reason: "Card expired" };
    }

    if (fullYear === currentYear && monthNum < currentMonth) {
      return { valid: false, reason: "Card expired" };
    }

    // Cards typically valid for 10 years
    if (fullYear > currentYear + 10) {
      return { valid: false, reason: "Expiration too far in future" };
    }

    return { valid: true, month: monthNum, year: fullYear };
  }

  /**
   * Validate CVV/CVC code
   * @param {string} cvv - CVV code
   * @param {Object} cardInfo - Card type info
   * @returns {boolean} True if CVV is valid
   */
  validateCVV(cvv, cardInfo) {
    if (!cvv) return false;
    const validLengths = cardInfo.cvvLength || [3];
    return validLengths.includes(cvv.length) && /^\d+$/.test(cvv);
  }

  /**
   * Validate card number structure (no obviously fake patterns)
   * @param {string} cardNumber - Cleaned card number
   * @returns {boolean} True if structure is valid
   */
  validateStructure(cardNumber) {
    // Check for repeating single digit (1111111111111111)
    if (/^(.)\1+$/.test(cardNumber)) return false;

    // Check for simple 2-char repeating patterns that fill the entire number (12121212...)
    if (/^(.{2})\1{6,}$/.test(cardNumber)) return false;

    return true;
  }

  /**
   * Comprehensive card validation
   * @param {string} cardData - Full card data string
   * @returns {Object} Validation result with all details
   */
  validateCard(cardData) {
    const { number, month, year, cvv } = this.extractCardData(cardData);

    if (!number) {
      return { valid: false, reason: "Missing card number" };
    }

    const cleanedNumber = this.cleanCardNumber(number);

    // Length validation
    if (!this.validateLength(cleanedNumber)) {
      return { valid: false, type: "unknown", reason: "Invalid card length" };
    }

    // Detect card type
    const cardInfo = this.detectCardType(cleanedNumber);
    const { type, name } = cardInfo;

    // Structure validation
    if (!this.validateStructure(cleanedNumber)) {
      return { valid: false, type, cardName: name, reason: "Invalid card structure" };
    }

    // Luhn algorithm check
    if (!this.luhnCheck(cleanedNumber)) {
      return { valid: false, type, cardName: name, reason: "Failed Luhn check" };
    }

    // BIN/IIN validation
    if (type !== "unknown" && !this.validateBIN(cleanedNumber, cardInfo)) {
      return { valid: false, type, cardName: name, reason: "Invalid BIN/IIN" };
    }

    // Expiration validation
    const expResult = this.validateExpiration(month, year);
    if (!expResult.valid) {
      return { valid: false, type, cardName: name, reason: expResult.reason };
    }

    // CVV validation
    if (!this.validateCVV(cvv, cardInfo)) {
      return { valid: false, type, cardName: name, reason: "Invalid CVV" };
    }

    return {
      valid: true,
      type,
      cardName: name,
      expMonth: expResult.month,
      expYear: expResult.year
    };
  }

  /**
   * Simulate card status (for demo purposes)
   * @returns {string} Status result
   */
  simulateStatus() {
    return Math.random() < 0.2 ? "LIVE" : "DEAD";
  }

  /**
   * Process batch of cards with progress tracking
   * @param {Array} cardsData - Array of card data strings
   * @param {Function} progressCallback - Called with progress updates
   * @param {Function} resultCallback - Called for each result
   * @returns {Object} Final batch statistics
   */
  async processBatch(cardsData, progressCallback, resultCallback) {
    if (this.isProcessing) return null;

    this.isProcessing = true;
    this.currentBatch = {
      total: cardsData.length,
      processed: 0,
      valid: 0,
      live: 0,
      dead: 0
    };

    for (let i = 0; i < cardsData.length; i++) {
      if (!this.isProcessing) break;

      const cardData = cardsData[i].trim();
      if (!cardData) {
        this.currentBatch.processed++;
        continue;
      }

      const validation = this.validateCard(cardData);
      let status = "INVALID";

      if (validation.valid) {
        status = this.simulateStatus();
        this.currentBatch.valid++;

        if (status === "LIVE") {
          this.currentBatch.live++;
        } else {
          this.currentBatch.dead++;
        }
      }

      this.currentBatch.processed++;
      const progress = Math.floor((this.currentBatch.processed / this.currentBatch.total) * 100);

      if (status === "LIVE" || status === "DEAD") {
        resultCallback({
          cardData,
          ...validation,
          status,
          progress
        });
      }

      progressCallback(this.currentBatch);

      // Small delay for UI responsiveness
      await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MS));
    }

    this.isProcessing = false;
    return this.currentBatch;
  }

  /**
   * Stop batch processing
   */
  stopProcessing() {
    this.isProcessing = false;
  }
}

/**
 * UI Controller - Handles all DOM interactions and user events
 */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize validator
  const validator = new CCValidator();

  // DOM element references
  const elements = {
    cardInput: document.getElementById("card-input"),
    validateBtn: document.getElementById("validate-btn"),
    stopBtn: document.getElementById("stop-btn"),
    clearBtn: document.getElementById("clear-btn"),
    themeToggle: document.getElementById("theme-toggle"),
    progressBar: document.getElementById("progress-bar"),
    resultsContainer: document.getElementById("results-container"),
    counters: {
      total: document.getElementById("total-count"),
      valid: document.getElementById("valid-count"),
      live: document.getElementById("live-count"),
      dead: document.getElementById("dead-count")
    }
  };

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeButton(newTheme);
  }

  /**
   * Update theme toggle button text
   */
  function updateThemeButton(theme) {
    const icon = theme === "dark" ? "☀️" : "🌙";
    elements.themeToggle.textContent = `${icon} ${theme === "dark" ? "Light" : "Dark"} Mode`;
  }

  /**
   * Initialize theme from localStorage
   */
  function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeButton(savedTheme);
  }

  /**
   * Update statistics counters with animation
   */
  function updateCounters(stats) {
    Object.entries(elements.counters).forEach(([key, element]) => {
      const newValue = stats[key];
      if (element.textContent !== String(newValue)) {
        element.textContent = newValue;
        element.classList.add("counter-update");
        setTimeout(() => element.classList.remove("counter-update"), 300);
      }
    });
  }

  /**
   * Create result card element with animation
   */
  function createResultCard(result) {
    const cardElement = document.createElement("div");
    cardElement.className = `result-card ${result.status.toLowerCase()} fade-in`;

    const { number, month, year, cvv } = validator.extractCardData(result.cardData);
    const displayYear = year.length === 2 ? `20${year}` : year;
    const cardTypeName = result.cardName || result.type.toUpperCase();

    cardElement.innerHTML = `
      <div class="card-header">
        <span class="card-type-badge ${result.type}">${cardTypeName}</span>
        <span class="status-badge ${result.status.toLowerCase()}">${result.status}</span>
      </div>
      <div class="card-number">${number}</div>
      <div class="card-details">
        <div class="detail-item">
          <span class="detail-label">Expires</span>
          <span class="detail-value">${month}/${displayYear}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">CVV</span>
          <span class="detail-value">${cvv}</span>
        </div>
      </div>
      ${result.reason ? `<div class="reason">${result.reason}</div>` : ""}
    `;

    return cardElement;
  }

  /**
   * Add result to UI with animation
   */
  function addResultToUI(result) {
    const cardElement = createResultCard(result);
    elements.resultsContainer.prepend(cardElement);

    // Trigger animation
    requestAnimationFrame(() => {
      cardElement.classList.add("visible");
    });
  }

  /**
   * Update progress bar
   */
  function updateProgress(progress) {
    elements.progressBar.style.width = `${progress}%`;
  }

  /**
   * Reset UI to initial state
   */
  function resetUI() {
    elements.cardInput.value = "";
    elements.resultsContainer.innerHTML = "";
    elements.progressBar.style.width = "0%";
    Object.values(elements.counters).forEach(counter => {
      counter.textContent = "0";
    });
  }

  /**
   * Set button states during processing
   */
  function setProcessingState(isProcessing) {
    elements.validateBtn.disabled = isProcessing;
    elements.stopBtn.disabled = !isProcessing;

    if (isProcessing) {
      elements.validateBtn.classList.add("loading");
    } else {
      elements.validateBtn.classList.remove("loading");
    }
  }

  /**
   * Handle validation start
   */
  async function handleValidation() {
    const cardsData = elements.cardInput.value
      .split("\n")
      .filter(line => line.trim());

    if (cardsData.length === 0) {
      showNotification("Please enter card data to validate", "warning");
      return;
    }

    setProcessingState(true);
    elements.resultsContainer.innerHTML = "";

    await validator.processBatch(
      cardsData,
      stats => updateCounters(stats),
      result => {
        updateProgress(result.progress);
        addResultToUI(result);
      }
    );

    setProcessingState(false);
    showNotification("Validation complete!", "success");
  }

  /**
   * Show notification toast
   */
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Add structured data for SEO
   */
  function addStructuredData() {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Advanced Credit Card Validator",
      description: "Validate credit card numbers using Luhn algorithm with BIN/IIN detection, expiration date and CVV verification",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      }
    };

    const scriptTag = document.createElement("script");
    scriptTag.type = "application/ld+json";
    scriptTag.text = JSON.stringify(structuredData);
    document.head.appendChild(scriptTag);
  }

  // Event listeners
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.validateBtn.addEventListener("click", handleValidation);
  elements.stopBtn.addEventListener("click", () => {
    validator.stopProcessing();
    setProcessingState(false);
  });
  elements.clearBtn.addEventListener("click", resetUI);

  // Initialize
  initializeTheme();
  addStructuredData();
});
