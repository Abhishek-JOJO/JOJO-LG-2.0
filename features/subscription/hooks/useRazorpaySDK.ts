"use client";

import { useState, useEffect, useCallback } from "react";

export interface UpiApp {
  name: string;
  package: string;
  displayName: string;
  icon: string;
}

// Razorpay's exact app name format - DO NOT CHANGE
// These MUST match what Razorpay SDK expects
const IOS_FALLBACK_UPI_APPS: UpiApp[] = [
  { 
    name: "com.phonepe.app",  // PhonePe - Use package name
    package: "com.phonepe.app", 
    displayName: "PhonePe", 
    icon: "/payment-icon/phonepe.png" 
  },
  { 
    name: "net.one97.paytm",  // Paytm - Use package name
    package: "net.one97.paytm", 
    displayName: "Paytm", 
    icon: "/payment-icon/paytm.png" 
  },
  { 
    name: "in.org.npci.upiapp",  // BHIM - Use package name
    package: "in.org.npci.upiapp", 
    displayName: "BHIM", 
    icon: "/payment-icon/bhim.png" 
  },
  { 
    name: "com.dreamplug.androidapp",  // CRED - Use package name
    package: "com.dreamplug.androidapp", 
    displayName: "CRED", 
    icon: "/payment-icon/cred.png" 
  },
];

const ALLOWED_UPI_PACKAGES = [
  'com.phonepe.app',                         // PhonePe
  'net.one97.paytm',                         // Paytm
  'in.org.npci.upiapp',                      // BHIM
  'com.dreamplug.androidapp'                 // CRED
];

export const useRazorpaySDK = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedUpiApps, setSupportedUpiApps] = useState<UpiApp[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * Dynamically load Razorpay SDK if not already loaded
   * This prevents blocking the initial page load
   */
  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if ((window as any).Razorpay) {
        setIsLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/razorpay.js";
      script.async = true;
      
      // Timeout protection - 15 seconds
      const timeout = setTimeout(() => {
        console.error("❌ Razorpay SDK load timeout (15s)");
        document.body.removeChild(script);
        resolve(false);
      }, 15000);
      
      script.onload = () => {
        clearTimeout(timeout);
        setIsLoaded(true);
        console.log("✅ Razorpay SDK loaded successfully");
        resolve(true);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        console.error("❌ Failed to load Razorpay SDK");
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  }, []);

  /**
   * Detect UPI apps available on the device
   * iOS: Uses predefined fallback list
   * Android: Queries native package manager via Razorpay SDK
   */
  const detectUpiApps = useCallback(async (retryCount = 0): Promise<UpiApp[]> => {
    setIsDetecting(true);

    try {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);

      // Check offline status
      if (!navigator.onLine) {
        console.warn("⚠️ Offline detected, using fallback apps");
        setSupportedUpiApps(IOS_FALLBACK_UPI_APPS);
        setIsDetecting(false);
        return IOS_FALLBACK_UPI_APPS;
      }

      // iOS devices - use fallback list
      if (isIOS) {
        setSupportedUpiApps(IOS_FALLBACK_UPI_APPS);
        setIsDetecting(false);
        return IOS_FALLBACK_UPI_APPS;
      }

      // Android devices - query installed apps
      if (isAndroid && (window as any).Razorpay) {
        try {
          // Create temporary Razorpay instance for app detection
          const rzp = new (window as any).Razorpay({ key: "dummy_key_for_detection" });
          
          if (typeof rzp.getSupportedUpiIntentApps === "function") {
            try {
              const detectedApps = await rzp.getSupportedUpiIntentApps();
              
              console.log("🔍 Detected UPI apps from device:", detectedApps);
              
              // Map detected apps to our app structure
              const mappedApps: UpiApp[] = detectedApps.map((appName: string) => {
                // Known app mappings with both short names and package names
                const knownApps: Record<string, UpiApp> = {
                  // Short names (returned by Razorpay API)
                  'gpay': { 
                    name: 'com.google.android.apps.nbu.paisa.user',
                    package: 'com.google.android.apps.nbu.paisa.user', 
                    displayName: 'GPay', 
                    icon: '/payment-icon/gpay.png' 
                  },
                  'phonepe': { 
                    name: 'com.phonepe.app',
                    package: 'com.phonepe.app', 
                    displayName: 'PhonePe', 
                    icon: '/payment-icon/phonepe.png' 
                  },
                  'paytm': { 
                    name: 'net.one97.paytm',
                    package: 'net.one97.paytm', 
                    displayName: 'Paytm', 
                    icon: '/payment-icon/paytm.png' 
                  },
                  'bhim': { 
                    name: 'in.org.npci.upiapp',
                    package: 'in.org.npci.upiapp', 
                    displayName: 'BHIM', 
                    icon: '/payment-icon/bhim.png' 
                  },
                  'cred': { 
                    name: 'com.dreamplug.androidapp',
                    package: 'com.dreamplug.androidapp', 
                    displayName: 'CRED', 
                    icon: '/payment-icon/cred.png' 
                  },
                  'amazon': { 
                    name: 'in.amazon.mShop.android.shopping',
                    package: 'in.amazon.mShop.android.shopping', 
                    displayName: 'Amazon Pay', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'mobikwik': { 
                    name: 'com.mobikwik_new',
                    package: 'com.mobikwik_new', 
                    displayName: 'MobiKwik', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'icici': { 
                    name: 'com.csam.icici.bank.imobile',
                    package: 'com.csam.icici.bank.imobile', 
                    displayName: 'iMobile', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'jupiter': { 
                    name: 'money.jupiter',
                    package: 'money.jupiter', 
                    displayName: 'Jupiter', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'payzapp': { 
                    name: 'com.enstage.wibmo.hdfc',
                    package: 'com.enstage.wibmo.hdfc', 
                    displayName: 'PayZapp', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'navi': { 
                    name: 'com.navi.app',
                    package: 'com.navi.app', 
                    displayName: 'Navi', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'moneyview': { 
                    name: 'com.moneyview',
                    package: 'com.moneyview', 
                    displayName: 'MoneyView', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'super_money': { 
                    name: 'com.supermoney.app',
                    package: 'com.supermoney.app', 
                    displayName: 'SuperMoney', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  'popclubapp': { 
                    name: 'com.popclub.app',
                    package: 'com.popclub.app', 
                    displayName: 'PopClub', 
                    icon: '/payment-icon/upi-generic.svg' 
                  },
                  // Skip 'any' - it's a generic fallback that causes duplicates
                  // Package names (full format)
                  'com.google.android.apps.nbu.paisa.user': { 
                    name: 'com.google.android.apps.nbu.paisa.user',
                    package: 'com.google.android.apps.nbu.paisa.user', 
                    displayName: 'GPay', 
                    icon: '/payment-icon/gpay.png' 
                  },
                  'com.phonepe.app': { 
                    name: 'com.phonepe.app',
                    package: 'com.phonepe.app', 
                    displayName: 'PhonePe', 
                    icon: '/payment-icon/phonepe.png' 
                  },
                  'net.one97.paytm': { 
                    name: 'net.one97.paytm',
                    package: 'net.one97.paytm', 
                    displayName: 'Paytm', 
                    icon: '/payment-icon/paytm.png' 
                  },
                  'in.org.npci.upiapp': { 
                    name: 'in.org.npci.upiapp',
                    package: 'in.org.npci.upiapp', 
                    displayName: 'BHIM', 
                    icon: '/payment-icon/bhim.png' 
                  },
                  'com.dreamplug.androidapp': { 
                    name: 'com.dreamplug.androidapp',
                    package: 'com.dreamplug.androidapp', 
                    displayName: 'CRED', 
                    icon: '/payment-icon/cred.png' 
                  },
                };
                
                // Try to match by exact name or short name
                const lowerAppName = appName.toLowerCase();
                const matchedApp = knownApps[lowerAppName] || knownApps[appName];
                
                if (matchedApp) {
                  console.log(`✅ Matched app: ${appName} → ${matchedApp.displayName}`);
                  return matchedApp;
                }
                
                // Skip generic 'any' app to avoid duplicates
                if (appName.toLowerCase() === 'any') {
                  console.log(`⏭️ Skipping generic 'any' app to avoid duplicates`);
                  return null;
                }
                
                // Unknown app - create generic entry
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`⚠️ Unknown UPI app detected: ${appName}`);
                }
                
                return {
                  name: appName,
                  package: appName,
                  displayName: appName.split('.').pop()?.toUpperCase() || appName.toUpperCase(),
                  icon: '/payment-icon/upi-generic.svg'
                };
              }).filter((app: any): app is UpiApp => app !== null && ALLOWED_UPI_PACKAGES.includes(app.package)); // Remove null and disallowed entries
              
              // Remove duplicates by package name
              const uniqueApps = mappedApps.reduce((acc: UpiApp[], app: UpiApp) => {
                if (!acc.some(existingApp => existingApp.package === app.package)) {
                  acc.push(app);
                }
                return acc;
              }, []);
              
              console.log("📱 Final mapped apps:", uniqueApps.map(a => ({ name: a.name, display: a.displayName })));
              
              setSupportedUpiApps(uniqueApps);
              setIsDetecting(false);
              return uniqueApps;
            } catch (detectionError) {
              console.error("❌ getSupportedUpiIntentApps() failed:", detectionError);
              
              // Retry once on failure
              if (retryCount < 1) {
                console.log("🔄 Retrying detection in 1 second...");
                await new Promise(resolve => setTimeout(resolve, 1000));
                return detectUpiApps(retryCount + 1);
              }
              
              throw detectionError; // Re-throw to outer catch
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to detect UPI apps via Razorpay SDK, using fallback:", err);
          // Fall through to fallback
        }
      }

      // Fallback for desktop or detection failure
      setSupportedUpiApps(IOS_FALLBACK_UPI_APPS);
      setIsDetecting(false);
      return IOS_FALLBACK_UPI_APPS;
      
    } catch (error) {
      console.error("❌ UPI app detection error:", error);
      
      // Final fallback - always safe
      setSupportedUpiApps(IOS_FALLBACK_UPI_APPS);
      setIsDetecting(false);
      return IOS_FALLBACK_UPI_APPS;
    }
  }, []); // Empty deps - function is stable

  // Auto-initialize on mount - FIXED: Empty deps to prevent infinite loop
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const loaded = await loadRazorpayScript();
      
      if (loaded && mounted) {
        await detectUpiApps();
      } else if (!loaded && mounted) {
        // SDK failed to load - use fallback apps
        console.warn("⚠️ SDK load failed, using fallback apps");
        setSupportedUpiApps(IOS_FALLBACK_UPI_APPS);
        setIsDetecting(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []); // CRITICAL FIX: Empty deps - initialize only once on mount

  return {
    isLoaded,
    supportedUpiApps,
    isDetecting,
    loadRazorpayScript,
    detectUpiApps,
  };
};
