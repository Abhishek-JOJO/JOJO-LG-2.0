"use client";

import React, { useState, useCallback } from "react";
import CryptoJS from "crypto-js";
import { env } from "@lib/config/env";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import { Navbar } from "@/components/layout/Navbar";

// Focusable Button helper component for TV Remote compatibility
function FocusableButton({
  focusKey,
  onClick,
  className,
  children,
}: {
  focusKey: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onClick,
  });

  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`${className} ${
        focused ? "ring-4 ring-orange-500 scale-105 shadow-orange-500/50 z-20" : ""
      } transition-all duration-200 outline-none`}
    >
      {children}
    </button>
  );
}

// Focusable Input helper component for TV Remote compatibility
function FocusableTextArea({
  focusKey,
  value,
  onChange,
  placeholder,
  rows = 6,
  className,
}: {
  focusKey: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
  });

  return (
    <textarea
      ref={ref as any}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${className} ${
        focused ? "ring-2 ring-orange-500 bg-neutral-900/90 border-orange-500/60" : ""
      } transition-all duration-200 outline-none`}
    />
  );
}

export function CryptoDebugClient() {
  const { ref: containerRef, focusKey } = useFocusable({
    focusKey: "CRYPTO_DEBUG_PAGE",
    isFocusBoundary: true,
  });

  const [inputCipher, setInputCipher] = useState(
    JSON.stringify(
      {
        data:
          "a696fcb0e1c41dd4113794f443c1dd4fa192de8ca765f6193a504ba8fde3e0ed28adfac63c1595a9e666121025f78789d641688f17872eb618fa9b1fae909eac8db98f7812b2e22ce74c90b452e0bb10f6ccdd7ce813d92c965d85c89e73f58a493a083d80373fdd3e20efe8a48683eb8a970616700c7a964973051302a4d15f50164b4990b4cd19c424d6f5b7332bded4cd9d9cff255126bd415045440b4967d404579a26ab8cf4f77b3918c868334095a3e857677f5f400235ef092ce245669d6deaf0999457a029a7b17061fe4f57ef34d8bbba170018a3ae78d2482d7e8338145c00e15db40f523892d96cf55d01772f5efaad95705e782f6306a51fa76eb91e6f70172178ec607fe7f364b5db55825d677d9a3e7328d725e4f414f013d6c6587ed24133e444c758ed8470096c5a77067dfefe8a9644f6827fc6ca4504585f726c0d7fa79d8dc90fb270ab43d130e3f25d7e7418c4b291e3e31fd9a18b7ebad41bbed0bfe7b17bef30cfe665053fbce1053654cf66fd3b0893d149534b72642be9265566d5df0f1dc4581a05a0a6216e6806feaa28cc0328dd141088d6f7a58959060a09e7df7e9143a9a8250ec6a7d9772e29d49703d39e7999920acf1b452e330b486dfa44281008dbe05fbee291629996d3b939d5a1657e4ce6bc5ddb8d06e68a7aa6bb76ea41da530d6df4c94ed61dea4e5bd3765c1e36e00d9a3309740a6c877f4ff67530ae0895860b26c46cc981e7b3019ab16b326ee920398ea04a4da1ddb9a1e11cf3e0ae013c78353334297b8d9d8dc8f556a37ea237af0424",
      },
      null,
      2
    )
  );

  const [secretKey, setSecretKey] = useState(env.secretKey || "");
  const [ivKey, setIvKey] = useState(env.ivKey || "");
  const [decryptedOutput, setDecryptedOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"decrypt" | "encrypt">("decrypt");

  // Perform Decryption
  const handleDecrypt = useCallback(() => {
    setError(null);
    setDecryptedOutput("");
    try {
      let hexToDecrypt = inputCipher.trim();

      // Check if input is a JSON string with a "data" property
      if (hexToDecrypt.startsWith("{")) {
        try {
          const parsed = JSON.parse(hexToDecrypt);
          if (parsed.data && typeof parsed.data === "string") {
            hexToDecrypt = parsed.data.trim();
          }
        } catch {
          // If JSON parse fails, treat as raw input
        }
      }

      if (!hexToDecrypt) {
        throw new Error("Input string is empty");
      }

      // Convert base64 secret key to WordArray
      const keyWordArray = CryptoJS.enc.Base64.parse(secretKey || env.secretKey);
      // Convert hex IV to WordArray
      const ivWordArray = CryptoJS.enc.Hex.parse(ivKey || env.ivKey);
      // Convert hex ciphertext to WordArray
      const ciphertextWordArray = CryptoJS.enc.Hex.parse(hexToDecrypt);

      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertextWordArray,
      });

      const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const result = decrypted.toString(CryptoJS.enc.Utf8);

      if (!result) {
        throw new Error("Decryption failed: malformed ciphertext or invalid Secret Key / IV");
      }

      // Format as formatted JSON if possible
      try {
        const jsonParsed = JSON.parse(result);
        setDecryptedOutput(JSON.stringify(jsonParsed, null, 2));
      } catch {
        setDecryptedOutput(result);
      }
    } catch (err: any) {
      setError(err?.message || "Decryption failed");
    }
  }, [inputCipher, secretKey, ivKey]);

  // Perform Encryption
  const handleEncrypt = useCallback(() => {
    setError(null);
    setDecryptedOutput("");
    try {
      const rawToEncrypt = inputCipher.trim();
      if (!rawToEncrypt) {
        throw new Error("Input text is empty");
      }

      const keyWordArray = CryptoJS.enc.Base64.parse(secretKey || env.secretKey);
      const ivWordArray = CryptoJS.enc.Hex.parse(ivKey || env.ivKey);

      const encrypted = CryptoJS.AES.encrypt(rawToEncrypt, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const hexOutput = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
      const formattedJson = JSON.stringify({ data: hexOutput }, null, 2);
      setDecryptedOutput(formattedJson);
    } catch (err: any) {
      setError(err?.message || "Encryption failed");
    }
  }, [inputCipher, secretKey, ivKey]);

  const handleCopy = useCallback(() => {
    if (!decryptedOutput) return;
    navigator.clipboard.writeText(decryptedOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [decryptedOutput]);

  const handleResetKeys = useCallback(() => {
    setSecretKey(env.secretKey || "");
    setIvKey(env.ivKey || "");
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={containerRef as any} className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
        <Navbar />

        <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  🔐 AES-256 Crypto Debugger
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  DEVELOPER TOOLS
                </span>
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                Decrypt and encrypt JSON payloads using application AES-256-CBC keys
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-neutral-900 border border-white/10 rounded-xl p-1.5 self-start sm:self-auto">
              <FocusableButton
                focusKey="btn-mode-decrypt"
                onClick={() => setActiveTab("decrypt")}
                className={`px-5 py-2 rounded-lg font-bold text-sm ${
                  activeTab === "decrypt"
                    ? "bg-orange-600 text-white shadow-lg"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                🔓 Decrypt Payload
              </FocusableButton>
              <FocusableButton
                focusKey="btn-mode-encrypt"
                onClick={() => setActiveTab("encrypt")}
                className={`px-5 py-2 rounded-lg font-bold text-sm ${
                  activeTab === "encrypt"
                    ? "bg-orange-600 text-white shadow-lg"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                🔒 Encrypt Payload
              </FocusableButton>
            </div>
          </div>

          {/* Key Configuration Controls */}
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                🔑 Cryptographic Environment Keys
              </h2>
              <FocusableButton
                focusKey="btn-reset-keys"
                onClick={handleResetKeys}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-white/10 font-semibold"
              >
                Reset to Default (.env)
              </FocusableButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  SECRET KEY (Base64)
                </label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs font-mono text-neutral-200 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  IV KEY (Hex)
                </label>
                <input
                  type="text"
                  value={ivKey}
                  onChange={(e) => setIvKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs font-mono text-neutral-200 outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Main Input & Output Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                  {activeTab === "decrypt" ? "📥 Paste Encrypted JSON or Hex Ciphertext" : "📝 Input Plaintext or JSON to Encrypt"}
                </label>
                <span className="text-xs text-neutral-500 font-mono">
                  {inputCipher.length} chars
                </span>
              </div>

              <FocusableTextArea
                focusKey="input-cipher-text"
                value={inputCipher}
                onChange={setInputCipher}
                rows={12}
                placeholder={
                  activeTab === "decrypt"
                    ? 'Paste {"data": "a696fc..."} or raw hex ciphertext...'
                    : 'Paste plaintext or JSON payload to encrypt...'
                }
                className="w-full p-4 rounded-2xl bg-neutral-950/80 border border-white/10 text-xs font-mono text-white/90 placeholder:text-neutral-600 resize-none shadow-inner"
              />

              <FocusableButton
                focusKey="btn-execute-crypto"
                onClick={activeTab === "decrypt" ? handleDecrypt : handleEncrypt}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-xl"
              >
                {activeTab === "decrypt" ? "⚡ Decrypt Payload Now" : "⚡ Encrypt Payload Now"}
              </FocusableButton>
            </div>

            {/* Output Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                  📤 Decrypted JSON / Output
                </label>
                {decryptedOutput && (
                  <FocusableButton
                    focusKey="btn-copy-output"
                    onClick={handleCopy}
                    className="text-xs px-3 py-1 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 font-bold"
                  >
                    {copied ? "✓ Copied to Clipboard!" : "📋 Copy Result"}
                  </FocusableButton>
                )}
              </div>

              <div className="relative flex-1 min-h-[300px] w-full p-4 rounded-2xl bg-neutral-950/90 border border-white/10 overflow-auto font-mono text-xs shadow-inner">
                {error ? (
                  <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 font-semibold flex flex-col gap-2">
                    <span className="font-bold flex items-center gap-1.5">
                      ⚠️ Decryption Error
                    </span>
                    <span>{error}</span>
                  </div>
                ) : decryptedOutput ? (
                  <pre className="text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                    {decryptedOutput}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                    <span className="text-3xl">🔍</span>
                    <span>Output will appear here after execution...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
