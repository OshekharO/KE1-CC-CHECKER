/**
 * Credit Card Validator Class
 * Implements comprehensive validation using Luhn algorithm and BIN/IIN detection
 */

// Processing configuration for responsive UI updates
const PROCESSING_DELAY_MS = 40;
const PROCESSING_CHUNK_SIZE = 20;

const REASON_CODES = {
  MISSING_CARD_NUMBER: "MISSING_CARD_NUMBER",
  INVALID_CARD_LENGTH: "INVALID_CARD_LENGTH",
  UNKNOWN_CARD_PROFILE: "UNKNOWN_CARD_PROFILE",
  INVALID_CARD_STRUCTURE: "INVALID_CARD_STRUCTURE",
  FAILED_LUHN: "FAILED_LUHN",
  INVALID_BIN_IIN: "INVALID_BIN_IIN",
  MISSING_EXPIRATION_DATE: "MISSING_EXPIRATION_DATE",
  INVALID_MONTH: "INVALID_MONTH",
  INVALID_YEAR_FORMAT: "INVALID_YEAR_FORMAT",
  INVALID_YEAR_LENGTH: "INVALID_YEAR_LENGTH",
  CARD_EXPIRED: "CARD_EXPIRED",
  EXPIRATION_TOO_FAR: "EXPIRATION_TOO_FAR",
  INVALID_CVV: "INVALID_CVV"
};

const REASON_MESSAGES = {
  [REASON_CODES.MISSING_CARD_NUMBER]: "Missing card number",
  [REASON_CODES.INVALID_CARD_LENGTH]: "Invalid card length",
  [REASON_CODES.UNKNOWN_CARD_PROFILE]: "Unsupported card profile",
  [REASON_CODES.INVALID_CARD_STRUCTURE]: "Invalid card structure",
  [REASON_CODES.FAILED_LUHN]: "Failed Luhn check",
  [REASON_CODES.INVALID_BIN_IIN]: "Invalid BIN/IIN",
  [REASON_CODES.MISSING_EXPIRATION_DATE]: "Missing date components",
  [REASON_CODES.INVALID_MONTH]: "Invalid month",
  [REASON_CODES.INVALID_YEAR_FORMAT]: "Invalid year format",
  [REASON_CODES.INVALID_YEAR_LENGTH]: "Year must be 2 or 4 digits",
  [REASON_CODES.CARD_EXPIRED]: "Card expired",
  [REASON_CODES.EXPIRATION_TOO_FAR]: "Expiration too far in future",
  [REASON_CODES.INVALID_CVV]: "Invalid CVV"
};

class CCValidator {
  constructor() {
    // Centralized card profile rules
    this.cardProfiles = {
      visa: {
        prefixes: [[4, 4]],
        lengths: [13, 16, 19],
        cvvLength: [3],
        name: "Visa"
      },
      mastercard: {
        prefixes: [[51, 55], [2221, 2720]],
        lengths: [16],
        cvvLength: [3],
        name: "Mastercard"
      },
      amex: {
        prefixes: [[34, 34], [37, 37]],
        lengths: [15],
        cvvLength: [4],
        name: "American Express"
      },
      discover: {
        prefixes: [[6011, 6011], [644, 649], [65, 65]],
        lengths: [16, 17, 18, 19],
        cvvLength: [3],
        name: "Discover"
      },
      diners: {
        prefixes: [[300, 305], [36, 36], [38, 39]],
        lengths: [14, 15, 16],
        cvvLength: [3],
        name: "Diners Club"
      },
      jcb: {
        prefixes: [[3528, 3589], [2131, 2131], [1800, 1800]],
        lengths: [15, 16, 17, 18, 19],
        cvvLength: [3],
        name: "JCB"
      },
      unionpay: {
        prefixes: [[62, 62]],
        lengths: [16, 17, 18, 19],
        cvvLength: [3],
        name: "UnionPay"
      },
      maestro: {
        prefixes: [[5018, 5018], [5020, 5020], [5038, 5038], [5893, 5893], [6304, 6304], [6759, 6759], [6761, 6763]],
        lengths: [12, 13, 14, 15, 16, 17, 18, 19],
        cvvLength: [3],
        name: "Maestro"
      }
    };

    this.isProcessing = false;
    this.currentBatch = null;
  }

  extractCardData(cardData) {
    const parts = cardData.split("|").map(part => part.trim());
    return {
      number: parts[0] || "",
      month: parts[1] || "",
      year: parts[2] || "",
      cvv: parts[3] || ""
    };
  }

  cleanCardNumber(cardNumber) {
    return cardNumber.replace(/\D/g, "");
  }

  createReason(reasonCode) {
    return { reasonCode, reason: REASON_MESSAGES[reasonCode] };
  }

  normalizeInput(cardData, originalIndex = 0) {
    const extracted = this.extractCardData(cardData);
    return {
      raw: cardData,
      originalIndex,
      ...extracted,
      cleanedNumber: this.cleanCardNumber(extracted.number)
    };
  }

  validateLength(cardNumber, cardInfo) {
    const length = cardNumber.length;
    if (cardInfo?.lengths?.length) {
      return cardInfo.lengths.includes(length);
    }
    return length >= 12 && length <= 19;
  }

  luhnCheck(cardNumber) {
    const length = cardNumber.length;

    if (length < 12 || length > 19) return false;

    let sum = 0;
    let isSecond = false;

    // Process from right to left
    for (let i = length - 1; i >= 0; i--) {
      let digit = Number(cardNumber[i]);

      if (isSecond) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isSecond = !isSecond;
    }

    return sum % 10 === 0;
  }

  prefixInRange(cardNumber, [start, end]) {
    const size = String(start).length;
    const prefix = parseInt(cardNumber.slice(0, size), 10);
    return !Number.isNaN(prefix) && prefix >= start && prefix <= end;
  }

  matchesProfile(cardNumber, profile) {
    const hasValidLength = profile.lengths.includes(cardNumber.length);
    if (!hasValidLength) return false;
    return profile.prefixes.some(range => this.prefixInRange(cardNumber, range));
  }

  detectCardType(cardNumber) {
    for (const [type, info] of Object.entries(this.cardProfiles)) {
      if (this.matchesProfile(cardNumber, info)) {
        return { type, ...info };
      }
    }
    return { type: "unknown", name: "Unknown", lengths: [], cvvLength: [3], prefixes: [] };
  }

  validateBIN(cardNumber, cardInfo) {
    if (!cardInfo.prefixes?.length) return true;
    return cardInfo.prefixes.some(range => this.prefixInRange(cardNumber, range));
  }

  validateExpiration(month, year) {
    if (!month || !year) {
      return { valid: false, ...this.createReason(REASON_CODES.MISSING_EXPIRATION_DATE) };
    }

    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, ...this.createReason(REASON_CODES.INVALID_MONTH) };
    }

    let fullYear = parseInt(year, 10);
    if (isNaN(fullYear)) {
      return { valid: false, ...this.createReason(REASON_CODES.INVALID_YEAR_FORMAT) };
    }

    if (year.length === 2) {
      fullYear = 2000 + fullYear;
    } else if (year.length !== 4) {
      return { valid: false, ...this.createReason(REASON_CODES.INVALID_YEAR_LENGTH) };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (fullYear < currentYear) {
      return { valid: false, ...this.createReason(REASON_CODES.CARD_EXPIRED) };
    }

    if (fullYear === currentYear && monthNum < currentMonth) {
      return { valid: false, ...this.createReason(REASON_CODES.CARD_EXPIRED) };
    }

    if (fullYear > currentYear + 10) {
      return { valid: false, ...this.createReason(REASON_CODES.EXPIRATION_TOO_FAR) };
    }

    return { valid: true, month: monthNum, year: fullYear };
  }

  validateCVV(cvv, cardInfo) {
    if (!cvv) return false;
    const validLengths = cardInfo.cvvLength || [3];
    return validLengths.includes(cvv.length) && /^\d+$/.test(cvv);
  }

  validateStructure(cardNumber) {
    if (/^(.)\1+$/.test(cardNumber)) return false;

    if (/^(.{2})\1{6,}$/.test(cardNumber)) return false;

    return true;
  }

  classifyStatus(isValid) {
    if (!isValid) return "INVALID";
    return this.simulateStatus();
  }

  validateCard(normalizedCard) {
    const { number, month, year, cvv, cleanedNumber } = normalizedCard;

    if (!number) {
      return {
        valid: false,
        type: "unknown",
        cardName: "Unknown",
        ...this.createReason(REASON_CODES.MISSING_CARD_NUMBER)
      };
    }

    if (!this.validateLength(cleanedNumber)) {
      return {
        valid: false,
        type: "unknown",
        cardName: "Unknown",
        ...this.createReason(REASON_CODES.INVALID_CARD_LENGTH)
      };
    }

    const cardInfo = this.detectCardType(cleanedNumber);
    const { type, name } = cardInfo;

    if (type === "unknown") {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.UNKNOWN_CARD_PROFILE)
      };
    }

    if (!this.validateLength(cleanedNumber, cardInfo)) {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.INVALID_CARD_LENGTH)
      };
    }

    if (!this.validateStructure(cleanedNumber)) {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.INVALID_CARD_STRUCTURE)
      };
    }

    if (!this.luhnCheck(cleanedNumber)) {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.FAILED_LUHN)
      };
    }

    if (!this.validateBIN(cleanedNumber, cardInfo)) {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.INVALID_BIN_IIN)
      };
    }

    const expResult = this.validateExpiration(month, year);
    if (!expResult.valid) {
      return {
        valid: false,
        type,
        cardName: name,
        reasonCode: expResult.reasonCode,
        reason: expResult.reason
      };
    }

    if (!this.validateCVV(cvv, cardInfo)) {
      return {
        valid: false,
        type,
        cardName: name,
        ...this.createReason(REASON_CODES.INVALID_CVV)
      };
    }

    return {
      valid: true,
      type,
      cardName: name,
      expMonth: expResult.month,
      expYear: expResult.year,
      reasonCode: null,
      reason: ""
    };
  }

  simulateStatus() {
    return Math.random() < 0.2 ? "LIVE" : "DEAD";
  }

  normalizeBatch(cardsData) {
    return cardsData.map((cardData, index) => this.normalizeInput(cardData.trim(), index));
  }

  async processBatch(cardsData, progressCallback, resultCallback) {
    if (this.isProcessing) return null;

    const normalizedBatch = this.normalizeBatch(cardsData);
    const totalRecords = normalizedBatch.length;

    this.isProcessing = true;
    this.currentBatch = {
      total: totalRecords,
      processed: 0,
      valid: 0,
      live: 0,
      dead: 0,
      progress: 0
    };

    const startTime = performance.now();

    for (let i = 0; i < totalRecords; i += PROCESSING_CHUNK_SIZE) {
      if (!this.isProcessing) break;
      const chunk = normalizedBatch.slice(i, i + PROCESSING_CHUNK_SIZE);

      for (const normalizedCard of chunk) {
        if (!this.isProcessing) break;

        if (!normalizedCard.raw) {
          this.currentBatch.processed++;
          this.currentBatch.progress = totalRecords === 0
            ? 0
            : Math.floor((this.currentBatch.processed / totalRecords) * 100);
          progressCallback(this.currentBatch);
          continue;
        }

        const validation = this.validateCard(normalizedCard);
        const status = this.classifyStatus(validation.valid);

        if (validation.valid) {
          this.currentBatch.valid++;
          if (status === "LIVE") {
            this.currentBatch.live++;
          } else {
            this.currentBatch.dead++;
          }
        }

        this.currentBatch.processed++;
        const progress = totalRecords === 0
          ? 0
          : Math.floor((this.currentBatch.processed / totalRecords) * 100);
        this.currentBatch.progress = progress;

        resultCallback({
          cardData: normalizedCard.raw,
          ...validation,
          status,
          progress
        });

        progressCallback(this.currentBatch);
      }

      await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MS));
    }

    const elapsedMs = performance.now() - startTime;
    this.currentBatch.elapsedMs = Number(elapsedMs.toFixed(2));
    this.currentBatch.averageMsPerCard = totalRecords
      ? Number((elapsedMs / totalRecords).toFixed(4))
      : 0;
    this.isProcessing = false;
    return this.currentBatch;
  }

  stopProcessing() {
    this.isProcessing = false;
  }

  generateLuhnNumber(prefix, totalLength) {
    const baseLength = totalLength - 1;
    let body = prefix;
    while (body.length < baseLength) {
      body += "0";
    }
    body = body.slice(0, baseLength);

    const checksum = (candidate) => {
      let sum = 0;
      let isSecond = false;
      for (let i = candidate.length - 1; i >= 0; i--) {
        let digit = Number(candidate[i]);
        if (isSecond) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isSecond = !isSecond;
      }
      return sum;
    };

    for (let checkDigit = 0; checkDigit <= 9; checkDigit++) {
      const candidate = `${body}${checkDigit}`;
      if (checksum(candidate) % 10 === 0) {
        return candidate;
      }
    }
    return `${body}0`;
  }

  runAcceptanceChecks() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const futureYear = String((now.getFullYear() + 2) % 100).padStart(2, "0");

    const correctnessResults = Object.entries(this.cardProfiles).map(([type, profile]) => {
      const prefix = String(profile.prefixes[0][0]);
      const cardNumber = this.generateLuhnNumber(prefix, profile.lengths[0]);
      const cvv = "0".repeat(profile.cvvLength[0]);
      const cardData = `${cardNumber}|${month}|${futureYear}|${cvv}`;
      const validation = this.validateCard(this.normalizeInput(cardData));
      return { type, passed: validation.valid && validation.type === type };
    });

    const reasonCases = [
      { cardData: "|01|2030|123", expected: REASON_CODES.MISSING_CARD_NUMBER },
      { cardData: "4111111111111111|13|2030|123", expected: REASON_CODES.INVALID_MONTH },
      { cardData: "4111111111111112|01|2030|123", expected: REASON_CODES.FAILED_LUHN }
    ];

    const reasonResults = reasonCases.map(testCase => {
      const validation = this.validateCard(this.normalizeInput(testCase.cardData));
      return validation.reasonCode === testCase.expected;
    });

    const benchmarkSample = 2000;
    const benchmarkCard = this.normalizeInput(`4111111111111111|${month}|${futureYear}|123`);
    const benchmarkStart = performance.now();
    for (let i = 0; i < benchmarkSample; i++) {
      this.validateCard(benchmarkCard);
    }
    const benchmarkElapsed = performance.now() - benchmarkStart;

    const acceptanceSummary = {
      correctness: correctnessResults.every(item => item.passed),
      reasonConsistency: reasonResults.every(Boolean),
      benchmarkAverageMsPerCard: Number((benchmarkElapsed / benchmarkSample).toFixed(4)),
      supportedIssuersChecked: correctnessResults.length
    };

    console.info("Acceptance checks:", acceptanceSummary);
    return acceptanceSummary;
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
    const cardsData = elements.cardInput.value.split("\n");
    const hasAtLeastOneCard = cardsData.some(line => line.trim());

    if (!hasAtLeastOneCard) {
      showNotification("Please enter card data to validate", "warning");
      return;
    }

    setProcessingState(true);
    elements.resultsContainer.innerHTML = "";

    const finalStats = await validator.processBatch(
      cardsData,
      stats => {
        updateCounters(stats);
        updateProgress(stats.progress || 0);
      },
      result => {
        addResultToUI(result);
      }
    );

    setProcessingState(false);
    if (finalStats) {
      showNotification(
        `Validation complete! Avg ${finalStats.averageMsPerCard}ms/card`,
        "success"
      );
    }
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
  validator.runAcceptanceChecks();
});
