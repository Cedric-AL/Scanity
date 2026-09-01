import {
  useState,
  useEffect,
  useRef,
  Fragment,
  type ReactNode,
  type CSSProperties,
} from "react"
import { createWorker } from "tesseract.js"
import {
  BrowserMultiFormatReader,
  IScannerControls,
} from "@zxing/browser"

import {
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library"

import logoImg from "@/imports/image-19.png"
import barcodeImg from "@/imports/image-26.png"
import ocrImg from "@/imports/image-27.png"


// ── Design tokens ─────────────────────────────────────────────────────────────
// Palette: "Pine & Cacao with Gold Accent" — deep pine green + cacao brown as
// the two base tones, with one bold gold used only for CTAs, active states,
// and highlights (kept separate from the green/amber/red food-safety score
// colors below, so that signal stays unambiguous).
const C = {
  green: "#1E5631", // pine green
  greenLight: "#E0A72E", // gold accent — named greenLight to avoid touching every call site
  greenMid: "#2F6B42", // mid pine
  mocha: "#4A2E1F", // cacao
  mochaDark: "#2A1D14", // near-black cacao
  mochaLight: "#8B6F5A", // light cacao
  mochaPale: "#F0E4D6",
  white: "#FFFFFF",
  offWhite: "#F7F2EA",
  black: "#2A1D14",
  gray: "#C8BDB5",
  grayLight: "#EDE7E1",
  inputBg: "#F2EBE4",
  border: "#D4C8BE",
  goldDark: "#C98A1F", // darker gold — gradient/hover partner for greenLight
  textOnDark: "#F0F0E8", // primary text color on dark (pine) screens
  statusSafe: "#4CAF50", // food-safety score: Safe / Good — kept separate from greenLight (gold)
  statusCaution: "#F5C518", // food-safety score: Caution
  statusDanger: "#E8453C", // food-safety score: Unsafe / Poor
}
// ── Safe-area constant ───────────────────────────────────────────────────────
// Keeps header content clear of the iPhone status bar / Dynamic Island.
// env(safe-area-inset-top) is reported by the OS/browser itself, so on a real
// deployed link it's 0 on Android, desktop, and non-notched devices (no extra
// space added there) and the correct nonzero value on notched/Dynamic-Island
// iPhones (paired with viewport-fit=cover in index.html's meta viewport tag).
//
// Figma Make's own device-preview panel loads the app inside an <iframe> and
// draws a decorative phone bezel/notch graphic *around* it — that graphic is
// just an image, not a real notch, so env(safe-area-inset-top) stays 0 in
// there too and the fake bezel ends up covering the header. Since real
// devices never render this app inside an iframe, `window.self !== window.top`
// is a reliable way to tell "I'm inside Figma's preview" apart from "I'm the
// real deployed page" — so only the preview gets the fixed floor.
const SAFE_TOP =
  typeof window !== "undefined" && window.self !== window.top
    ? "max(59px, env(safe-area-inset-top))" // inside Figma Make's preview iframe
    : "env(safe-area-inset-top, 0px)" // real device / real deployed link
type Screen = "splash" | "login" | "register" | "success" | "allergies" | "health" | "loading" | "allset" | "dashboard" | "history" | "barcode" | "ocr" | "profile" | "help" | "about" | "privacy" | "terms" | "settings" | "delete" | "forgotPassword" | "resetPassword" | "confirmationPassword" | "language" | "productResult" | "productCompare"
// ── Responsive helpers ───────────────────────────────────────────────────────
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint,
  )
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [breakpoint])
  return isDesktop
}
// A width-capped, auto-centered column. Used to keep readable content from
// stretching edge-to-edge on wide browser windows while backgrounds/headers
// stay full-bleed.
function Center({
  children,
  maxWidth = 640,
  style,
}: {
  children: ReactNode
  maxWidth?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        marginLeft: "auto",
        marginRight: "auto",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
// ── App shell (replaces the old fixed-size phone mockup) ────────────────────
function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: C.offWhite,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  )
}
// ── Back button ───────────────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: `1.5px solid ${C.border}`,
        background: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
        <path
          d="M7 1L1 7L7 13"
          stroke={C.black}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo({ size = 160, style }: { size?: number; style?: CSSProperties }) {
  return (
    <img
      src={logoImg}
      alt="NutriGuard logo"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        mixBlendMode: "multiply",
        ...style,
      }}
    />
  )
}
// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  icon,
  placeholder,
  type = "text",
  value,
  onChange,
  hint,
}: {
  icon: ReactNode
  placeholder: string
  type?: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === "password"
  return (
    <div style={{ marginBottom: hint ? 4 : 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: C.inputBg,
          border: `1.5px solid ${C.border}`,
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <span style={{ color: C.mochaLight, flexShrink: 0 }}>{icon}</span>
        <input
          type={isPassword && !show ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            fontFamily: "'Poppins', sans-serif",
            fontSize: 14,
            color: C.black,
          }}
        />
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.gray,
              padding: 2,
            }}
          >
            {show ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hint && (
        <p
          style={{
            fontSize: 10,
            color: C.gray,
            marginTop: 4,
            marginLeft: 4,
            marginBottom: 10,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({
  label,
  onClick,
  color = C.mocha,
}: {
  label: string
  onClick: () => void
  color?: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        padding: "16px",
        borderRadius: 16,
        border: "none",
        background: hover ? C.mochaDark : color,
        color: C.white,
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: "0.04em",
        cursor: "pointer",
        transition: "background 0.18s",
        boxShadow: `0 4px 16px ${color}55`,
      }}
    >
      {label}
    </button>
  )
}
// ────────────────────────────────────────────────────────────────────────────
// Screens
// ────────────────────────────────────────────────────────────────────────────
function SplashScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Keyframes for entrance animations + button interactions */}
      <style>{`
        @keyframes scanitySplashBg {
          from { transform: scale(1.08); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scanityLogoIn {
          0% { opacity: 0; transform: scale(0.7) translateY(10px); }
          60% { opacity: 1; transform: scale(1.05) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scanityFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        
        }
        .scanity-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }
        .scanity-btn:hover {
          transform: translateY(-2px) scale(1.015);
          filter: brightness(1.06);
        }
        .scanity-btn:active {
          transform: translateY(0) scale(0.97);
          filter: brightness(0.96);
        }
        .scanity-signin:hover {
          text-decoration: underline;
        }
      `}</style>

      {/* Background photo */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          animation: "scanitySplashBg 1.4s ease-out both",
        }}
      />
      {/* Dark gradient overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.82)",
        }}
      />
      {/* Logo + brand centered */}
      <Center
        maxWidth={480}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          gap: 0,
        }}
      >
        <img
          src={logoImg}
          alt="Scanity logo"
          style={{
            width: 280,
            height: 220,
            objectFit: "contain",
            mixBlendMode: "screen",
            animation:
              "scanityLogoIn 0.9s cubic-bezier(0.22,1,0.36,1) both, scanityPulseGlow 3.2s ease-in-out 1s infinite",
          }}
        />
        {/* Brand name */}
        <div
          style={{
            textAlign: "center",
            marginTop: -16,
            animation: "scanityFadeUp 0.7s ease-out 0.35s both",
          }}
        >
          <h1
            style={{
              fontWeight: 800,
              fontSize: 42,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: 0,
              marginLeft: 0,
              marginRight: 0,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span style={{ color: C.textOnDark }}>Scan</span>
            <span style={{ color: C.greenLight }}>ity</span>
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgb(190, 223, 162)",
              marginTop: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 500,
            }}
          >
            See · Know · Eat
          </p>
        </div>
      </Center>
      {/* Bottom CTA — no background */}
      <Center
        maxWidth={480}
        style={{ padding: "28px 28px 44px", position: "relative", zIndex: 1 }}
      >
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.65,
            textAlign: "center",
            fontWeight: 500,
            marginBottom: 40,
            animation: "scanityFadeUp 0.7s ease-out 0.5s both",
          }}
        >
          Your personal{" "}
          <span style={{ color: C.greenLight, fontWeight: 700 }}>nutrition</span> &{" "}
          <span style={{ color: C.greenLight, fontWeight: 700 }}>
            allergy safety
          </span>{" "}
          companion. Scan ingredients, understand what's in your food, and
          instantly know if it fits your dietary needs
        </p>
        <button
          className="scanity-btn"
          onClick={() => go("login")}
          style={{
            width: "100%",
            padding: "17px",
            borderRadius: 18,
            border: "none",
            background: `linear-gradient(135deg, ${C.mocha} 0%, ${C.mochaDark} 100%)`,
            color: C.white,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: `0 8px 24px ${C.mocha}50`,
            letterSpacing: "0.02em",
            animation: "scanityFadeUp 0.7s ease-out 0.65s both",
          }}
        >
          Get Started
        </button>
        <p
          style={{
            textAlign: "center",
            marginTop: 14,
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Poppins', sans-serif",
            animation: "scanityFadeUp 0.7s ease-out 0.75s both",
          }}
        >
          Already have an account?{" "}
          <button
            className="scanity-signin"
            onClick={() => go("login")}
            style={{
              background: "none",
              border: "none",
              color: C.greenLight,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "'Poppins', sans-serif",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </p>
      </Center>
    </div>
  )
}

function LoginScreen({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const isDesktop = useIsDesktop()

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes scanityLogoIn {
          0% { opacity: 0; transform: scale(0.7) translateY(10px); }
          60% { opacity: 1; transform: scale(1.05) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scanityFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scanity-login-form input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(224,167,46,0.5);
          transition: box-shadow 0.2s ease;
        }
        .scanity-link {
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .scanity-link:hover {
          transform: translateY(-1px);
          text-decoration: underline;
        }
      `}</style>

      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDesktop
            ? "rgba(5, 25, 14, 0.72)"
            : "rgba(12, 32, 18, 0.82)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
          padding: isDesktop ? "40px 24px" : "20px 28px 40px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isDesktop ? 560 : 440,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: isDesktop ? 0 : 10,
              paddingBottom: isDesktop ? 28 : 32,
            }}
          >
            <div style={{ animation: "scanityLogoIn 0.8s cubic-bezier(0.22,1,0.36,1) both" }}>
              <Logo
                size={isDesktop ? 180 : 200}
                style={{
                  borderRadius: 0,
                  marginBottom: -12,
                  mixBlendMode: "screen",
                }}
              />
            </div>

            <p
              style={{
              fontWeight: 800,
              fontSize: isDesktop ? 30 : 32,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: 0,
              marginLeft: 0,
              marginRight: 0,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span style={{ color: C.textOnDark }}>Scan</span>
            <span style={{ color: C.greenLight }}>ity</span>
            </p>

            <h2
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontWeight: 800,
                fontSize: isDesktop ? 30 : 26,
                color: C.textOnDark,
                textAlign: "center",
                animation: "scanityFadeUp 0.6s ease-out 0.3s both",
              }}
            >
              Welcome Back!
            </h2>

            <p
              style={{
                fontSize: isDesktop ? 14 : 13,
                color: "rgba(255,255,255,0.7)",
                marginTop: 6,
                marginBottom: 0,
                textAlign: "center",
                animation: "scanityFadeUp 0.6s ease-out 0.4s both",
              }}
            >
              Please login to continue
            </p>
          </div>

          <div className="scanity-login-form">
            <div style={{ animation: "scanityFadeUp 0.5s ease-out 0.45s both" }}>
              <Field
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
                placeholder="Email"
                type="email"
                value={email}
                onChange={setEmail}
              />
            </div>

            <div style={{ animation: "scanityFadeUp 0.5s ease-out 0.55s both" }}>
              <Field
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                }
                placeholder="Password"
                type="password"
                value={password}
                onChange={setPassword}
              />
            </div>

            <div
              style={{
                textAlign: "right",
                marginTop: 4,
                marginBottom: isDesktop ? 32 : 28,
                animation: "scanityFadeUp 0.5s ease-out 0.6s both",
              }}
            >
              <button
                type="button"
                className="scanity-link"
                onClick={() => go("forgotPassword")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.greenLight,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 12 : 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>

            <div style={{ animation: "scanityFadeUp 0.5s ease-out 0.7s both" }}>
              <PrimaryBtn label="LOGIN" onClick={() => go("success")} color={C.mocha} />
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 22,
                fontSize: isDesktop ? 14 : 13,
                color: "rgba(255,255,255,0.7)",
                animation: "scanityFadeUp 0.5s ease-out 0.8s both",
              }}
            >
              Don't have an account?{" "}
              <button
                className="scanity-link"
                onClick={() => go("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.greenLight,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: isDesktop ? 14 : 13,
                  cursor: "pointer",
                }}
              >
                Register
              </button>
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: isDesktop ? 35 : 24,
              animation: "scanityFadeUp 0.5s ease-out 0.9s both",
            }}
          >
            <div style={{ width: 40, height: 3, borderRadius: 2, background: C.green }} />
            <div style={{ width: 12, height: 3, borderRadius: 2, background: C.mocha }} />
            <div style={{ width: 6, height: 3, borderRadius: 2, background: C.gray }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RegisterScreen({ go }: { go: (s: Screen) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const isDesktop = useIsDesktop()

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDesktop
            ? "rgba(5, 25, 14, 0.72)"
            : "rgba(12, 32, 18, 0.82)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
          padding: isDesktop ? "40px 24px" : "20px 28px 40px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isDesktop ? 560 : 440,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* Logo and heading */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: isDesktop ? 0 : 10,
              paddingBottom: isDesktop ? 28 : 32,
            }}
          >
            <Logo
              size={isDesktop ? 180 : 200}
              style={{
                borderRadius: 0,
                marginBottom: -12,
                mixBlendMode: "screen",
              }}
            />

            <p
              style={{
                marginTop: "-12px",
                marginBottom: 0,
                fontWeight: 800,
                fontSize: isDesktop ? 30 : 32,
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ color: C.textOnDark }}>Scan</span>
              <span style={{ color: C.greenLight }}>ity</span>
            </p>

            <h2
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontWeight: 800,
                fontSize: isDesktop ? 30 : 26,
                color: C.textOnDark,
                textAlign: "center",
              }}
            >
              Create Account
            </h2>

            <p
              style={{
                fontSize: isDesktop ? 14 : 13,
                color: "rgba(255,255,255,0.7)",
                marginTop: 6,
                marginBottom: 0,
                textAlign: "center",
              }}
            >
              Sign up to get started
            </p>
          </div>

          {/* Form */}
          <div>
            <Field
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              placeholder="Full Name"
              value={name}
              onChange={setName}
            />

            <Field
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
              placeholder="Email"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <Field
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
              hint="Min 8 characters, 1 number"
            />

            <Field
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              placeholder="Confirm Password"
              type="password"
              value={confirm}
              onChange={setConfirm}
            />

            <div style={{ marginTop: isDesktop ? 8 : 4 }}>
              <PrimaryBtn
                label="Register"
                onClick={() => go("success")}
                color={C.mocha}
              />
            </div>

            {/* Login */}
            <p
              style={{
                textAlign: "center",
                marginTop: 22,
                fontSize: isDesktop ? 14 : 13,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Already have an account?{" "}
              <button
                onClick={() => go("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.greenLight,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: isDesktop ? 14 : 13,
                  cursor: "pointer",
                }}
              >
                Login
              </button>
            </p>
          </div>

          {/* Bottom accent */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: isDesktop ? 35 : 24,
            }}
          >
            <div
              style={{
                width: 6,
                height: 3,
                borderRadius: 2,
                background: C.gray,
              }}
            />

            <div
              style={{
                width: 12,
                height: 3,
                borderRadius: 2,
                background: C.mocha,
              }}
            />

            <div
              style={{
                width: 40,
                height: 3,
                borderRadius: 2,
                background: C.green,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "#0C2012",
      }}
    >
      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(8,25,14,0.88) 0%, rgba(12,32,18,0.92) 100%)",
        }}
      />
      {/* Content */}
      <Center
        maxWidth={480}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 28px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: "50%",
            border: "8px solid rgba(224,167,46,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 45,
            marginTop: 5,
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: C.greenLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 30px rgba(224,167,46,0.35)",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        {/* Title */}
        <h2
          style={{
            fontWeight: 800,
            fontSize: 25,
            color: C.textOnDark,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Registration Successful!
        </h2>
        {/* Subtitle */}
        <p
          style={{
            fontSize: 14,
            color: C.greenLight,
            textAlign: "center",
            margin: "10px 0 0",
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Let's personalize your nutrition experience.
        </p>
        {/* Information Card */}
        <div
          style={{
            width: "100%",
            marginTop: 30,
            padding: "18px 18px",
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.10)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxSizing: "border-box",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: 12,
              background: "rgba(125, 194, 66, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(224,167,46,0.08)",
              marginBottom: 14,
            }}
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.greenLight}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3L5 6v5c0 4.5 2.9 8.3 7 9.5 4.1-1.2 7-5 7-9.5V6l-7-3z" />
              <path d="M8.5 12l2.2 2.2 4.8-5" />
            </svg>
          </div>
          {/* Text */}
          <p
            style={{
              flex: 1,
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.86)",
              textAlign: "left",
              fontWeight: 400,
            }}
          >
            Before you start scanning, tell us about your allergies and health
            conditions so we can provide better nutrition insights tailored to
            you.
          </p>
        </div>
        {/* Get Started Button */}
        <div
          style={{
            width: "100%",
            marginTop: 26,
          }}
        >
          <PrimaryBtn
            label="Get Started"
            onClick={() => go("allergies")}
            color={C.green}
          />
        </div>
        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 24,
          }}
        >
          <div
            style={{
              width: 24,
              height: 5,
              borderRadius: 10,
              background: C.greenLight,
            }}
          />
          <div
            style={{
              width: 7,
              height: 5,
              borderRadius: 10,
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <div
            style={{
              width: 7,
              height: 5,
              borderRadius: 10,
              background: "rgba(255,255,255,0.25)",
            }}
          />
        </div>
      </Center>
    </div>
  )
}
const ALLERGY_LIST = [
  { id: "peanuts", label: "Peanuts", icon: "🥜", iconBg: "#B5834A" },
  { id: "tree-nuts", label: "Tree Nuts", icon: "🌰", iconBg: "#C4574B" },
  { id: "dairy", label: "Dairy", icon: "🥛", iconBg: "#4A90C4" },
  { id: "eggs", label: "Eggs", icon: "🥚", iconBg: "#E0A72E" },
  { id: "wheat", label: "Wheat / Gluten", icon: "🌾", iconBg: "#6B9E4A" },
  { id: "soy", label: "Soy", icon: "🫘", iconBg: "#C45B8A" },
  { id: "fish", label: "Fish", icon: "🐟", iconBg: "#4A90C4" },
  { id: "shellfish", label: "Shellfish", icon: "🦐", iconBg: "#C4574B" },
  { id: "sesame", label: "Sesame", icon: "🌿", iconBg: "#6B9E4A" },
  { id: "other", label: "Other", icon: "➕", iconBg: "#8A6FC4" },
]

function AllergiesScreen({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["peanuts"]))
  const [otherText, setOtherText] = useState("")

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.82)",
        }}
      />
      <Center
        maxWidth={560}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
          paddingTop: SAFE_TOP,
        }}
      >
        <div style={{ padding: "16px 28px 20px", textAlign: "center" }}>
          {/* icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
              marginTop: 50,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.textOnDark}
                strokeWidth="1.8"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path
                  d="M9 12l2 2 4-4"
                  stroke={C.greenLight}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 22, color: C.textOnDark }}>
            Select your allergies
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              marginTop: 6,
            }}
          >
            Choose all that apply to you.
          </p>
        </div>

        {/* Allergy list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingBottom: 16,
            }}
          >
            {/* Normal allergy cards */}
            {ALLERGY_LIST.filter((i) => i.id !== "other").map((item) => {
              const active = selected.has(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${
                      active ? C.green : "rgba(255,255,255,0.15)"
                    }`,
                    background: active
                      ? "rgba(224,167,46,0.2)"
                      : "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: item.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: C.textOnDark,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <polyline
                        points="12 3 5.5 10 2 6.5"
                        stroke={C.textOnDark}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              )
            })}

            {/* OTHER */}
            <div
              onClick={() => toggle("other")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 999,
                border: `1.5px solid ${
                  selected.has("other") ? C.green : "rgba(255,255,255,0.15)"
                }`,
                background: selected.has("other")
                  ? "rgba(224,167,46,0.2)"
                  : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                cursor: "pointer",
                transition: "all 0.18s ease",
                gridColumn: "1 / -1",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#8A6FC4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                ➕
              </span>
              {selected.has("other") ? (
                <input
                  autoFocus
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Please specify"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: C.textOnDark,
                  }}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: C.textOnDark,
                  }}
                >
                  Other
                </span>
              )}
            </div>
          </div>
        </div>

        {/* sticky footer */}
        <div
          style={{
            padding: "14px 24px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {selected.size} selected
          </span>
          <button
            onClick={() => go("health")}
            style={{
              flex: 1,
              maxWidth: 200,
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: C.mocha,
              color: C.white,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: `0 4px 14px ${C.mocha}44`,
            }}
          >
            Continue
          </button>
        </div>
      </Center>
    </div>
  )
}
// ── Health Conditions Screen ──────────────────────────────────────────────────
const HEALTH_LIST = [
  { id: "diabetes", label: "Diabetes", icon: "🩸", iconBg: "#C4574B" },
  { id: "hypertension", label: "Hypertension", icon: "❤️", iconBg: "#C45B8A" },
  { id: "celiac", label: "Celiac Disease", icon: "🌾", iconBg: "#6B9E4A" },
  { id: "lactose", label: "Lactose Intolerance", icon: "🥛", iconBg: "#4A90C4" },
  { id: "ibs", label: "IBS / Crohn's", icon: "🫁", iconBg: "#B5834A" },
  { id: "kidney", label: "Kidney Disease", icon: "🫘", iconBg: "#8A6FC4" },
  { id: "heart", label: "Heart Disease", icon: "💊", iconBg: "#E0A72E" },
  { id: "none", label: "None of the above", icon: "✓", iconBg: "#6B9E4A" },
]

function HealthScreen({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [otherText, setOtherText] = useState("")

  const toggle = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.82)",
        }}
      />
      {/* Content */}
      <Center
        maxWidth={560}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
          paddingTop: SAFE_TOP,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 28px 20px",
            textAlign: "center",
            marginTop:50,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.textOnDark}
                strokeWidth="1.8"
              >
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke={C.greenLight}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 22,
              color: C.textOnDark,
              margin: 0,
            }}
          >
            Select health conditions
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              marginTop: 6,
            }}
          >
            Choose all that apply to you.
          </p>
        </div>

        {/* Health condition list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingBottom: 16,
            }}
          >
            {/* Normal health condition cards */}
            {HEALTH_LIST.map((item) => {
              const active = selected.has(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${
                      active ? C.green : "rgba(255,255,255,0.15)"
                    }`,
                    background: active
                      ? "rgba(224,167,46,0.2)"
                      : "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: item.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: C.textOnDark,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <polyline
                        points="12 3 5.5 10 2 6.5"
                        stroke={C.textOnDark}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              )
            })}

            {/* OTHER */}
            <div
              onClick={() => toggle("other")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 999,
                border: `1.5px solid ${
                  selected.has("other") ? C.green : "rgba(255,255,255,0.15)"
                }`,
                background: selected.has("other")
                  ? "rgba(224,167,46,0.2)"
                  : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                cursor: "pointer",
                transition: "all 0.18s ease",
                gridColumn: "1 / -1",
              }}
            >
              {/* Plus icon */}
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#8A6FC4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                ➕
              </span>
              {/* Input when selected */}
              {selected.has("other") ? (
                <input
                  autoFocus
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Please specify"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: C.textOnDark,
                  }}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: C.textOnDark,
                  }}
                >
                  Other
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div
          style={{
            padding: "14px 24px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {selected.size} selected
          </span>
          <button
            onClick={() => go("loading")}
            style={{
              flex: 1,
              maxWidth: 200,
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: C.mocha,
              color: C.white,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: `0 4px 14px ${C.mocha}44`,
            }}
          >
            Continue
          </button>
        </div>
      </Center>
    </div>
  )
}

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen({ go }: { go: (s: Screen) => void }) {
  const [progress] = useState(75)
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.82)",
        }}
      />
      <Center
        maxWidth={480}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          gap: 28,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* circular progress */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="140"
            height="140"
            style={{ position: "absolute", transform: "rotate(-90deg)" }}
          >
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={C.greenLight}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 32,
              color: C.textOnDark,
            }}
          >
            {progress}%
          </span>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 22,
              color: C.textOnDark,
              marginTop: 0,
              marginBottom: 6,
            }}
          >
            Personalizing your experience…
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginTop: 0,
            }}
          >
            This may take a few seconds.
          </p>
        </div>
        {/* steps */}
        <style>{`
          @keyframes progressLine {
            from { width: 0% }
            to { width: 100% }
          }
        `}</style>
        <div style={{ width: "100%", padding: "0 8px" }}>
          {/* connector track */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              position: "relative",
            }}
          >
            {[{ done: true }, { done: true }, { done: false }].map(
              (step, i, arr) => (
                <Fragment key={i}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: step.done
                        ? C.greenLight
                        : "rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {step.done ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <polyline
                          points="12 3 6 11 2 7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.4)",
                        }}
                      />
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: 2,
                        margin: "0 4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          background: C.greenLight,
                          borderRadius: 2,
                          width: i === 0 ? "100%" : "40%",
                          animation:
                            i === 1
                              ? "progressLine 2s ease-in-out infinite"
                              : "none",
                        }}
                      />
                    </div>
                  )}
                </Fragment>
              ),
            )}
          </div>
          {/* labels */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { label: "Setting up your profile", done: true },
              { label: "Analyzing your preferences", done: true },
              { label: "Preparing recommendations", done: false },
            ].map((step, i) => (
              <div
                key={i}
                style={{ flex: 1, textAlign: "center", padding: "0 2px" }}
              >
                <p
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 9,
                    color: step.done ? C.greenLight : "rgba(255,255,255,0.4)",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => go("allset")}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            border: "none",
            background: C.green,
            color: C.white,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: `0 4px 14px ${C.green}44`,
          }}
        >
          Continue
        </button>
      </Center>
    </div>
  )
}
// ── All Set Screen ────────────────────────────────────────────────────────────
function AllSetScreen({ go }: { go: (s: Screen) => void }) {
  const checks = [
    "Allergies saved",
    "Health conditions saved",
    "Personalization complete",
  ]
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxmcmVzaCUyMGNvbG9yZnVsJTIwZnJ1aXRzJTIwdmVnZXRhYmxlcyUyMGhlYWx0aHklMjBmb29kfGVufDF8fHx8MTc4NjIzOTc1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.82)",
        }}
      />
      <Center
        maxWidth={480}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          gap: 24,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* shield icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: C.greenLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(224,167,46,0.45)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              fill="rgba(255,255,255,0.15)"
              stroke="white"
              strokeWidth="1.5"
            />
            <polyline
              points="9 12 11 14 15 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 26,
              color: C.textOnDark,
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            You're all set!
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginTop: 0,
              lineHeight: 1.6,
            }}
          >
            We'll now provide personalized
            <br />
            nutrition insights just for you.
          </p>
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {checks.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1.5px solid rgba(224,167,46,0.4)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: C.greenLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <polyline
                    points="10 3 5 9 2 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  color: C.textOnDark,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ width: "100%" }}>
          <PrimaryBtn
            label="Go to Dashboard"
            onClick={() => go("dashboard")}
            color={C.mocha}
          />
        </div>
      </Center>
    </div>
  )
}
// ── Dashboard ────────────────────────────────────────────────────────────────

const RECENT_SCANS = [
  {
    name: "Milk",
    date: "Aug 5, 2026",
    time: "7:30 AM",
    score: 87,
    safe: true,
  },
  {
    name: "Orange Juice",
    date: "Aug 5, 2026",
    time: "6:30 PM",
    score: 72,
    safe: true,
  },
  {
    name: "Chocolate Bar",
    date: "Aug 7, 2026",
    time: "10:15 AM",
    score: 58,
    safe: false,
  },
  {
    name: "Corn Flakes",
    date: "Aug 9, 2026",
    time: "8:45 AM",
    score: 81,
    safe: true,
  },
  {
    name: "Potato Chips",
    date: "Aug 12, 2026",
    time: "3:20 PM",
    score: 64,
    safe: true,
  },
  {
    name: "Yogurt",
    date: "Aug 15, 2026",
    time: "9:10 AM",
    score: 91,
    safe: true,
  },
  {
    name: "Instant Noodles",
    date: "Aug 18, 2026",
    time: "12:40 PM",
    score: 55,
    safe: false,
  },
  {
    name: "Tuna Sandwich",
    date: "Aug 22, 2026",
    time: "1:15 PM",
    score: 84,
    safe: true,
  },
]

function DashboardScreen({
  go,
}: {
  go: (s: Screen) => void
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false)

  const [showLogoutLoading, setShowLogoutLoading] =
    useState(false)

  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  // ═══════════════════════════════════════════════════════════════════════════
  // COLORS
  // ═══════════════════════════════════════════════════════════════════════════

  const PALETTE = {
    pageBg: "#e8e5e0",

    // Green gradient
    sidebarBg: "#176B3A",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",

    cardWhite: "#FFFFFF",

    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",

    border: "#E5E3DC",
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  const getScoreStatus = (score: number) => {
    if (score >= 80) {
      return {
        label: "Safe",
        color: "#4CAF50",
        background: "#E8F5E9",
      }
    }

    if (score >= 60) {
      return {
        label: "Fair",
        color: "#D99A00",
        background: "#FFF5D9",
      }
    }

    return {
      label: "Caution",
      color: "#E53935",
      background: "#FDEAEA",
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION CARDS
  // ═══════════════════════════════════════════════════════════════════════════

  const cards = [
    {
      label: "Scan OCR",
      icon: (
        <i className="fa fa-file-text-o" />
      ),
      action: () => go("ocr"),
    },
    {
      label: "Compare Products",
      icon: (
        <i className="fa fa-balance-scale" />
      ),
      action: () =>
        go("productCompare"),
    },
  ]

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR ITEMS
  // ═══════════════════════════════════════════════════════════════════════════

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR MENU
  // ═══════════════════════════════════════════════════════════════════════════

  const sidebarMenu = (
    <>
      {/* LOGO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,

          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            color: "#FFFFFF",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
        <span style={{ color: C.textOnDark }}>Scan</span>
        <span style={{ color: C.greenLight }}>ity</span>      
        </span>
      </div>

      {/* MENU TITLE */}

      <p
        style={{
          margin: 0,

          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",

          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",

          color:
            "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* MENU */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,

          padding: isDesktop
            ? "0 10px"
            : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,

              padding: isDesktop
                ? "12px 14px"
                : "11px 12px",

              background:
                "transparent",

              border: "none",
              borderRadius: 14,

              cursor: "pointer",

              width: "100%",

              textAlign: "left",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,

                fontSize:
                  isDesktop ? 13 : 12,

                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* LOGOUT */}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() =>
            setShowLogoutConfirm(true)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,

            padding: isDesktop
              ? "12px 14px"
              : "11px 12px",

            background:
              "transparent",

            border: "none",
            borderRadius: 14,

            cursor: "pointer",

            width: "100%",

            textAlign: "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              textAlign: "center",

              color: "#FFFFFF",

              transform:
                "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,

              fontSize:
                isDesktop ? 13 : 12,

              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div
      style={{
        flex: 1,

        display: "flex",
        flexDirection: "column",

        position: "relative",

        overflow: "hidden",

        backgroundColor:
          PALETTE.pageBg,

        fontFamily: FONT,
      }}
    >
      {/* ═════════════════════════════════════════════════════════════════════
          ANIMATIONS
      ═════════════════════════════════════════════════════════════════════ */}

      <style>
        {`
          @keyframes logoutProgress {
            from {
              width: 0%;
            }

            to {
              width: 100%;
            }
          }

          @keyframes scanityFadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanityBackdropIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes scanityCardIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background:
              rgba(255,255,255,0.10) !important;

            transform:
              translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform: scale(0.97);
          }

          .scanity-hero-card,
          .scanity-action-card,
          .scanity-scan-row {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-hero-card:hover {
            transform:
              translateY(-4px);

            box-shadow:
              0 20px 45px
              rgba(0,0,0,0.09) !important;
          }

          .scanity-action-card:hover {
            transform:
              translateY(-5px);

            box-shadow:
              0 20px 40px
              rgba(21,91,50,0.30) !important;
          }

          .scanity-scan-row:hover {
            transform:
              translateY(-2px);

            box-shadow:
              0 10px 22px
              rgba(0,0,0,0.10) !important;
          }

          .scanity-hero-card:active,
          .scanity-action-card:active,
          .scanity-scan-row:active {
            transform:
              scale(0.98);
          }

          .scanity-viewall {
            transition:
              opacity 0.15s ease,
              transform 0.15s ease;
          }

          .scanity-viewall:hover {
            opacity: 0.7;
            transform:
              translateX(2px);
          }

          .scanity-hamburger {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-hamburger:hover {
            transform:
              translateY(-2px);

            box-shadow:
              0 8px 20px
              rgba(0,0,0,0.08) !important;
          }

          .scanity-hamburger:active {
            transform:
              scale(0.94);
          }

          .scanity-profile {
            transition:
              transform 0.15s ease,
              opacity 0.15s ease;
          }

          .scanity-profile:hover {
            transform:
              translateY(-1px);

            opacity: 0.8;
          }

          .scanity-action-arrow {
            transition:
              transform 0.18s ease,
              background 0.18s ease;
          }

          .scanity-action-card:hover
          .scanity-action-arrow {
            transform:
              translateX(4px);

            background:
              rgba(255,255,255,0.20);
          }
        `}
      </style>

      {/* ═════════════════════════════════════════════════════════════════════
          SIDEBAR
      ═════════════════════════════════════════════════════════════════════ */}

      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            zIndex: 50,

            display: "flex",
          }}
        >
          {/* BACKDROP */}

          <div
            onClick={() =>
              setSidebarOpen(false)
            }
            style={{
              position: "absolute",
              inset: 0,

              background:
                "rgba(0,0,0,0.40)",

              backdropFilter:
                "blur(4px)",

              WebkitBackdropFilter:
                "blur(4px)",

              animation:
                "scanityBackdropIn 0.2s ease-out both",
            }}
          />

          {/* SIDEBAR */}

          <div
            style={{
              position: "relative",

              zIndex: 51,

              width:
                isDesktop ? 245 : 220,

              height:
                `calc(100% - ${
                  isDesktop ? 32 : 20
                }px)`,

              margin:
                isDesktop
                  ? "16px"
                  : "10px",

              // GRADIENT SIDEBAR
              background:
                `linear-gradient(
                  160deg,
                  #155B32 0%,
                  #176B3A 45%,
                  #2E8B57 100%
                )`,

              borderRadius: 26,

              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",

              display: "flex",
              flexDirection: "column",

              paddingTop: SAFE_TOP,
              paddingBottom: 24,

              boxSizing:
                "border-box",

              overflow: "hidden",

              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* DECORATIVE CIRCLE */}

            <div
              style={{
                position: "absolute",

                width: 160,
                height: 160,

                borderRadius: "50%",

                top: -90,
                right: -80,

                background:
                  "rgba(255,255,255,0.06)",

                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",

                width: 120,
                height: 120,

                borderRadius: "50%",

                bottom: 10,
                left: -75,

                background:
                  "rgba(255,255,255,0.04)",

                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LOGOUT CONFIRMATION
      ═════════════════════════════════════════════════════════════════════ */}

      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            zIndex: 100,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            padding: 20,

            background:
              "rgba(20,20,20,0.5)",

            backdropFilter:
              "blur(10px)",

            WebkitBackdropFilter:
              "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",

              maxWidth: 310,

              padding:
                "28px 22px 22px",

              borderRadius: 28,

              background:
                PALETTE.cardWhite,

              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",

              textAlign: "center",

              boxSizing:
                "border-box",

              fontFamily: FONT,
            }}
          >
            {/* ICON */}

            <div
              style={{
                width: 70,
                height: 70,

                margin:
                  "0 auto 16px",

                borderRadius: "50%",

                background:
                  "rgba(23,107,58,0.10)",

                border:
                  `2px solid ${PALETTE.green}`,

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,

                  color:
                    PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin:
                  "0 0 8px",

                fontFamily: FONT,

                fontWeight: 700,

                fontSize: 18,

                letterSpacing:
                  "-0.01em",

                color:
                  PALETTE.textDark,

                lineHeight: 1.35,
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin:
                  "0 auto 20px",

                maxWidth: 240,

                fontFamily: FONT,

                fontWeight: 400,

                fontSize: 11,

                lineHeight: "16px",

                color:
                  PALETTE.textMuted,
              }}
            >
              You will need to login again
              <br />
              to access your account.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                type="button"

                onClick={() =>
                  setShowLogoutConfirm(false)
                }

                style={{
                  flex: 1,

                  height: 44,

                  border:
                    "1px solid #DADADA",

                  borderRadius: 14,

                  background:
                    "#F5F5F5",

                  color:
                    PALETTE.textDark,

                  fontFamily: FONT,

                  fontWeight: 500,

                  fontSize: 12,

                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"

                onClick={handleLogout}

                style={{
                  flex: 1,

                  height: 44,

                  border: "none",

                  borderRadius: 14,

                  background:
                    `linear-gradient(
                      135deg,
                      ${PALETTE.greenDark},
                      ${PALETTE.greenLight}
                    )`,

                  color: "#FFFFFF",

                  fontFamily: FONT,

                  fontWeight: 600,

                  fontSize: 12,

                  cursor: "pointer",

                  boxShadow:
                    "0 8px 22px rgba(21,91,50,0.28)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LOGOUT LOADING
      ═════════════════════════════════════════════════════════════════════ */}

      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            zIndex: 110,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            padding: 20,

            background:
              "rgba(20,20,20,0.55)",

            backdropFilter:
              "blur(10px)",

            WebkitBackdropFilter:
              "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",

              maxWidth: 300,

              padding:
                "30px 22px 24px",

              borderRadius: 28,

              background:
                PALETTE.cardWhite,

              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",

              textAlign: "center",

              boxSizing:
                "border-box",

              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,

                margin:
                  "0 auto 16px",

                borderRadius: "50%",

                background:
                  "rgba(23,107,58,0.08)",

                border:
                  `2px solid ${PALETTE.green}`,

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 29,

                  color:
                    PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin:
                  "0 0 7px",

                fontFamily: FONT,

                fontWeight: 700,

                fontSize: 17,

                color:
                  PALETTE.textDark,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin:
                  "0 0 19px",

                fontFamily: FONT,

                fontWeight: 400,

                fontSize: 11,

                color:
                  PALETTE.textMuted,
              }}
            >
              Please wait...
            </p>

            <div
              style={{
                width: "100%",

                height: 8,

                borderRadius: 8,

                overflow: "hidden",

                background: "#EDEDED",

                border:
                  "1px solid #DADADA",
              }}
            >
              <div
                style={{
                  width: "0%",

                  height: "100%",

                  borderRadius: 8,

                  background:
                    `linear-gradient(
                      90deg,
                      ${PALETTE.greenDark},
                      ${PALETTE.greenLight}
                    )`,

                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>

            <p
              style={{
                margin:
                  "11px 0 0",

                fontFamily: FONT,

                fontWeight: 500,

                fontSize: 10,

                color:
                  PALETTE.textMuted,
              }}
            >
              Please wait a moment.
            </p>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═════════════════════════════════════════════════════════════════════ */}

      <div
        style={{
          flex: 1,

          display: "flex",

          flexDirection: "column",

          position: "relative",

          zIndex: 1,

          minHeight: 0,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            TOP BAR
        ═══════════════════════════════════════════════════════════════════ */}

        <div
          style={{
            paddingTop:
              SAFE_TOP,

            paddingLeft:
              isDesktop ? 40 : 20,

            paddingRight:
              isDesktop ? 40 : 20,

            paddingBottom: 10,

            display: "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            marginTop:
              isDesktop ? 18 : 12,

            animation:
              "scanityFadeUp 0.5s ease-out both",
          }}
        >
          {/* HAMBURGER */}

          <button
            type="button"

            className="scanity-hamburger"

            aria-label="Open navigation"

            onClick={() =>
              setSidebarOpen(true)
            }

            style={{
              width: 42,
              height: 42,

              background:
                PALETTE.cardWhite,

              border:
                "1px solid #E0E0E0",

              borderRadius: 15,

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent:
                "center",

              flexShrink: 0,

              boxShadow:
                "0 6px 16px rgba(0,0,0,0.05)",

              padding: 0,
            }}
          >
            <div
              style={{
                width: 20,

                display: "flex",

                flexDirection:
                  "column",

                gap: 5,
              }}
            >
              <span
                style={{
                  display: "block",

                  width: 20,

                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  display: "block",

                  width: 20,

                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  display: "block",

                  width: 20,

                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />
            </div>
          </button>

          {/* GREETING */}

          <div
            style={{
              flex: 1,

              marginLeft: 18,
            }}
          >
            <h2
              style={{
                fontFamily: FONT,

                fontWeight: 700,

                fontSize:
                  isDesktop ? 28 : 20,

                color:
                  PALETTE.textDark,

                margin: 0,

                letterSpacing:
                  "-0.02em",
              }}
            >
              Hello, User!
            </h2>

            <p
              style={{
                fontFamily: FONT,

                fontWeight: 500,

                fontSize: 12,

                color:
                  PALETTE.greenText,

                margin:
                  "4px 0 0",
              }}
            >
              See It. Know It. Eat It.
            </p>
          </div>

          {/* PROFILE */}

          <button
            type="button"

            className="scanity-profile"

            onClick={() =>
              go("profile")
            }

            style={{
              display: "flex",

              alignItems: "center",

              gap: 9,

              border: "none",

              background:
                "transparent",

              cursor: "pointer",

              padding: 0,

              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,

                borderRadius:
                  "50%",

                background:
                  "#ECECE9",

                border:
                  "1px solid #DADAD5",

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-user"

                style={{
                  fontSize: 14,

                  color:
                    PALETTE.textDark,
                }}
              />
            </div>

            {isDesktop && (
              <span
                style={{
                  fontFamily: FONT,

                  fontWeight: 500,

                  fontSize: 13,

                  color:
                    PALETTE.textDark,
                }}
              >
                Username
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BODY
        ═══════════════════════════════════════════════════════════════════ */}

        <div
          style={{
            flex: 1,

            overflowY: "auto",

            padding:
              isDesktop
                ? "12px 40px 40px"
                : "6px 16px 24px",

            minHeight: 0,

            boxSizing:
              "border-box",
          }}
        >
          {/* MAIN GRID */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                isDesktop
                  ? "1.7fr 1fr"
                  : "1fr",

              gap: 24,

              alignItems:
                "start",

              width: "100%",
            }}
          >
            {/* ═══════════════════════════════════════════════════════════════
                LEFT COLUMN
            ═══════════════════════════════════════════════════════════════ */}

            <div
              style={{
                display: "flex",

                flexDirection:
                  "column",

                gap: 18,
              }}
            >
              {/* ═════════════════════════════════════════════════════════════
                  SCAN BARCODE
              ═════════════════════════════════════════════════════════════ */}

              <button
                type="button"

                className="scanity-hero-card"

                onClick={() =>
                  go("barcode")
                }

                style={{
                  width: "100%",

                  minHeight:
                    isDesktop
                      ? 300
                      : 250,

                  display: "flex",

                  flexDirection:
                    "column",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  // FIXED PADDING
                  padding:
                    isDesktop
                      ? "38px 48px 32px"
                      : "28px 24px",

                  borderRadius: 26,

                  background:
                    PALETTE.cardWhite,

                  border:
                    `1px solid ${PALETTE.border}`,

                  boxShadow:
                    "0 14px 34px rgba(0,0,0,0.06)",

                  cursor: "pointer",

                  boxSizing:
                    "border-box",

                  animation:
                    "scanityCardIn 0.5s ease-out 0.05s both",

                  textAlign: "left",
                }}
              >
                {/* TEXT CONTAINER */}

                <div
                  style={{
                    width: "100%",

                    maxWidth: 900,

                    margin: "0 auto",

                    textAlign: "left",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,

                      fontFamily: FONT,

                      fontWeight: 700,

                      fontSize:
                        isDesktop
                          ? 25
                          : 19,

                      lineHeight: 1.25,

                      letterSpacing:
                        "-0.02em",

                      color:
                        PALETTE.textDark,
                    }}
                  >
                    Scan Barcode
                  </h3>

                  <p
                    style={{
                      margin:
                        "10px 0 0",

                      fontFamily: FONT,

                      fontWeight: 400,

                      fontSize:
                        isDesktop
                          ? 14
                          : 12,

                      lineHeight: 1.5,

                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    Scan barcodes to get the product information from the food.
                  </p>
                </div>

                {/* BARCODE */}

                <div
                  style={{
                    width: "100%",

                    display: "flex",

                    justifyContent:
                      "center",

                    alignItems:
                      "center",

                    marginTop:
                      isDesktop
                        ? 24
                        : 20,

                    marginBottom: 2,
                  }}
                >
                  <svg
                    width={
                      isDesktop
                        ? 360
                        : 230
                    }

                    height={
                      isDesktop
                        ? 105
                        : 75
                    }

                    viewBox="0 0 360 105"

                    fill="none"
                  >
                    {[
                      5, 10, 15, 20,
                      25, 30, 37, 42,
                      47, 53, 59, 64,
                      70, 76, 82, 88,
                      94, 100, 106, 112,
                      118, 124, 130, 136,
                      142, 148, 154, 160,
                      166, 172, 178, 184,
                      190, 196, 202, 208,
                      214, 220, 226, 232,
                      238, 244, 250, 256,
                      262, 268, 274, 280,
                      286, 292, 298, 304,
                      310, 316, 322, 328,
                      334, 340, 346,
                    ].map(
                      (x, i) => (
                        <rect
                          key={i}

                          x={x}

                          y={4}

                          width={
                            i % 3 === 0
                              ? 3.2
                              : 1.7
                          }

                          height={68}

                          fill={
                            PALETTE.textDark
                          }
                        />
                      )
                    )}

                    <text
                      x="180"

                      y="94"

                      textAnchor="middle"

                      fontFamily={FONT}

                      fontSize="15"

                      fontWeight="600"

                      fill={
                        PALETTE.textDark
                      }
                    >
                      1234567890000
                    </text>
                  </svg>
                </div>
              </button>

              {/* ═════════════════════════════════════════════════════════════
                  ACTION CARDS
                  (enlarged — capped just under Scan Barcode's height so it
                  never exceeds the hero card or Scan History panel)
              ═════════════════════════════════════════════════════════════ */}

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap: 18,
                }}
              >
                {cards.map(
                  (card, i) => (
                    <button
                      type="button"

                      key={card.label}

                      className="scanity-action-card"

                      onClick={
                        card.action
                      }

                      style={{
                        minHeight:
                          isDesktop
                            ? 270
                            : 220,

                        display: "flex",

                        flexDirection:
                          "column",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        gap: 16,

                        // GREEN GRADIENT
                        background:
                          `linear-gradient(
                            145deg,
                            ${PALETTE.greenDark} 0%,
                            ${PALETTE.green} 45%,
                            ${PALETTE.greenLight} 100%
                          )`,

                        border: "none",

                        borderRadius: 24,

                        padding:
                          isDesktop
                            ? "24px 14px"
                            : "20px 12px",

                        boxSizing:
                          "border-box",

                        cursor:
                          "pointer",

                        width: "100%",

                        boxShadow:
                          "0 14px 30px rgba(21,91,50,0.24)",

                        animation:
                          `scanityCardIn 0.5s ease-out ${
                            0.12 +
                            i * 0.06
                          }s both`,
                      }}
                    >
                      {/* ICON */}

                      <div
                        style={{
                          width:
                            isDesktop
                              ? 72
                              : 56,

                          height:
                            isDesktop
                              ? 72
                              : 56,

                          borderRadius:
                            "50%",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          color:
                            "#FFFFFF",

                          background:
                            "rgba(255,255,255,0.12)",

                          fontSize:
                            isDesktop
                              ? 38
                              : 30,
                        }}
                      >
                        {card.icon}
                      </div>

                      {/* LABEL */}

                      <span
                        style={{
                          fontFamily:
                            FONT,

                          fontWeight: 600,

                          fontSize:
                            isDesktop
                              ? 18
                              : 14,

                          color:
                            "#FFFFFF",

                          textAlign:
                            "center",
                        }}
                      >
                        {card.label}
                      </span>

                      {/* ARROW */}

                      <div
                        className="scanity-action-arrow"

                        style={{
                          width: 36,
                          height: 36,

                          borderRadius:
                            "50%",

                          background:
                            "rgba(255,255,255,0.12)",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          color:
                            "#FFFFFF",

                          fontSize: 18,
                        }}
                      >
                        <i className="fa fa-angle-right" />
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                RECENT SCANS
            ═══════════════════════════════════════════════════════════════ */}

            <div
              className="scanity-recent-panel"

              style={{
                // GREEN GRADIENT
                background:
                  `linear-gradient(
                    145deg,
                    ${PALETTE.greenDark} 0%,
                    ${PALETTE.green} 45%,
                    ${PALETTE.greenLight} 100%
                  )`,

                borderRadius: 26,

                padding: 18,

                boxSizing:
                  "border-box",

                boxShadow:
                  "0 14px 32px rgba(21,91,50,0.24)",

                animation:
                  "scanityCardIn 0.5s ease-out 0.2s both",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  display: "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  padding:
                    "0 4px 14px",
                }}
              >
                <h3
                  style={{
                    margin: 0,

                    fontFamily: FONT,

                    fontWeight: 700,

                    fontSize: 16,

                    letterSpacing:
                      "-0.01em",

                    color: "#FFFFFF",
                  }}
                >
                  Scan History
                </h3>

                <button
                  type="button"

                  className="scanity-viewall"

                  onClick={() =>
                    go("history")
                  }

                  style={{
                    display: "flex",

                    alignItems:
                      "center",

                    gap: 5,

                    border: "none",

                    background:
                      "transparent",

                    padding: 0,

                    fontFamily: FONT,

                    fontWeight: 600,

                    fontSize: 11,

                    color: "#FFFFFF",

                    cursor:
                      "pointer",
                  }}
                >
                  View All

                  <i
                    className="fa fa-angle-right"

                    style={{
                      fontSize: 13,
                    }}
                  />
                </button>
              </div>

              {/* SCANS */}

              <div
                style={{
                  display: "flex",

                  flexDirection:
                    "column",

                  gap: 9,
                }}
              >
                {RECENT_SCANS.map(
                  (scan, i) => {
                    const status =
                      getScoreStatus(
                        scan.score
                      )

                    return (
                      <button
                        type="button"

                        key={`${scan.name}-${scan.date}-${scan.time}`}

                        className="scanity-scan-row"

                        onClick={() =>
                          go(
                            "productResult"
                          )
                        }

                        style={{
                          width: "100%",

                          display: "flex",

                          alignItems:
                            "center",

                          gap: 10,

                          padding:
                            "9px 10px",

                          background:
                            PALETTE.cardWhite,

                          border: "none",

                          borderRadius: 16,

                          boxSizing:
                            "border-box",

                          cursor:
                            "pointer",

                          textAlign:
                            "left",

                          boxShadow:
                            "0 4px 12px rgba(0,0,0,0.08)",

                          animation:
                            `scanityCardIn 0.4s ease-out ${
                              0.25 +
                              i * 0.06
                            }s both`,
                        }}
                      >
                        {/* PRODUCT ICON */}

                        <div
                          style={{
                            width: 38,
                            height: 38,

                            borderRadius: 12,

                            background:
                              "#E8F0EA",

                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",

                            flexShrink: 0,
                          }}
                        >
                          <i
                            className="fa fa-shopping-bag"

                            style={{
                              fontSize: 16,

                              color:
                                PALETTE.green,
                            }}
                          />
                        </div>

                        {/* PRODUCT INFO */}

                        <div
                          style={{
                            flex: 1,

                            minWidth: 0,

                            overflow:
                              "hidden",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,

                              fontFamily:
                                FONT,

                              fontWeight: 600,

                              fontSize: 12,

                              color:
                                PALETTE.textDark,

                              whiteSpace:
                                "nowrap",

                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {scan.name}
                          </p>

                          <p
                            style={{
                              margin:
                                "3px 0 0",

                              fontFamily:
                                FONT,

                              fontWeight: 400,

                              fontSize: 9,

                              color:
                                PALETTE.textMuted,

                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {scan.date} •{" "}
                            {scan.time}
                          </p>
                        </div>

                        {/* SCORE + STATUS */}

                        <div
                          style={{
                            display: "flex",

                            flexDirection:
                              "column",

                            alignItems:
                              "flex-end",

                            justifyContent:
                              "center",

                            gap: 5,

                            flexShrink: 0,

                            minWidth: 67,
                          }}
                        >
                          {/* SCORE */}

                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "baseline",

                              gap: 2,
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  FONT,

                                fontWeight: 700,

                                fontSize: 17,

                                lineHeight: 1,

                                color:
                                  PALETTE.textDark,
                              }}
                            >
                              {scan.score}
                            </span>

                            <span
                              style={{
                                fontFamily:
                                  FONT,

                                fontWeight: 400,

                                fontSize: 8,

                                color:
                                  PALETTE.textMuted,
                              }}
                            >
                              /100
                            </span>
                          </div>

                          {/* STATUS LABEL */}

                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap: 5,

                              padding:
                                "3px 7px",

                              borderRadius: 8,

                              background:
                                status.background,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,

                                borderRadius:
                                  "50%",

                                background:
                                  status.color,

                                flexShrink: 0,
                              }}
                            />

                            <span
                              style={{
                                fontFamily:
                                  FONT,

                                fontWeight: 600,

                                fontSize: 8,

                                lineHeight: 1,

                                color:
                                  status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* CHEVRON */}

                        <i
                          className="fa fa-angle-right"

                          style={{
                            fontSize: 14,

                            color:
                              "#BDBDBD",

                            flexShrink: 0,
                          }}
                        />
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Barcode Scanner Screen ────────────────────────────────────────────────────

// Make sure these already exist in your project:
// import logoImg from "@/imports/image-19.png"
// import { Screen } from "./...."
// import { useIsDesktop } from "./...."

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ScannerStatus =
  | "ready"
  | "camera-loading"
  | "scanning"
  | "captured"
  | "processing"
  | "success"
  | "invalid"
  | "not-found"
  | "permission-denied"
  | "unsupported"
  | "network-error"
  | "error"

type ProductResult = {
  barcode?: string

  productInformation?: {
    name?: string
    brand?: string
    category?: string
    image?: string
    imageUrl?: string
  }

  product?: {
    name?: string
    brand?: string
    category?: string
    image?: string
    image_url?: string
    ingredients?: string
    ingredients_text?: string
    nutrition?: Record<string, any>
  }

  ingredients?: string | string[]

  nutrition?: Record<string, any>

  healthAnalysis?: {
    score?: number
    rating?: string
    summary?: string
  }

  allergyCheck?: {
    hasAllergy?: boolean
    matchedAllergies?: string[]
  }

  allergyStatus?: string

  [key: string]: any
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function BarcodeScannerScreen({
  go,
}: {
  go: (s: Screen) => void
}) {
  // ───────────────────────────────────────────────────────────────────────────
  // UI STATE
  // ───────────────────────────────────────────────────────────────────────────

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [showHelp, setShowHelp] = useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false)

  const [showLogoutLoading, setShowLogoutLoading] =
    useState(false)

  const [scanStatus, setScanStatus] =
    useState<ScannerStatus>("ready")

  const [barcodeValue, setBarcodeValue] =
    useState("")

  const [manualBarcode, setManualBarcode] =
    useState("")

  const [errorMessage, setErrorMessage] =
    useState("")

  const [cameraFacing, setCameraFacing] =
    useState<"environment" | "user">(
      "environment"
    )

  const [flashOn, setFlashOn] =
    useState(false)

  const [galleryImage, setGalleryImage] =
    useState<string | null>(null)

  const [productResult, setProductResult] =
    useState<ProductResult | null>(null)

  // ───────────────────────────────────────────────────────────────────────────
  // REFS
  // ───────────────────────────────────────────────────────────────────────────

  const videoRef =
    useRef<HTMLVideoElement | null>(null)

  const streamRef =
    useRef<MediaStream | null>(null)

  const readerRef =
    useRef<BrowserMultiFormatReader | null>(null)

  const processingRef =
    useRef(false)

  const lastScannedBarcodeRef =
    useRef<string>("")

  const lastScanTimeRef =
    useRef<number>(0)

  const isMountedRef =
    useRef(true)

  const galleryObjectUrlRef =
    useRef<string | null>(null)

  // ───────────────────────────────────────────────────────────────────────────
  // DESKTOP
  // ───────────────────────────────────────────────────────────────────────────

  const isDesktop = useIsDesktop()

  // ───────────────────────────────────────────────────────────────────────────
  // FONT
  // ───────────────────────────────────────────────────────────────────────────

  const FONT = "'Poppins', sans-serif"

  // ───────────────────────────────────────────────────────────────────────────
  // COLORS
  // ───────────────────────────────────────────────────────────────────────────

  const PALETTE = {
    pageBg: "#E8E5E0",

    sidebarBg: "#176B3A",
    sidebarDark: "#155B32",

    green: "#176B3A",
    greenLight: "#2E8B57",

    white: "#FFFFFF",

    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",

    border: "#E5E3DC",

    yellow: "#E0A72E",

    red: "#C94C4C",
    redSoft: "#FBECEC",

    greenSoft: "#E8F4EC",

    blue: "#3B6EA8",
    blueSoft: "#EDF4FC",
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BACKEND API
  // ───────────────────────────────────────────────────────────────────────────

  /*
   * IMPORTANT:
   *
   * Change this if your backend endpoint is different.
   *
   * Example:
   * VITE_API_URL=http://localhost:8000
   *
   * Then:
   * VITE_BARCODE_LOOKUP_URL=http://localhost:8000/api/barcode/lookup
   */

  const BACKEND_API_URL =
    import.meta.env.VITE_BARCODE_LOOKUP_URL ||
    "/api/barcode/lookup"

  // ───────────────────────────────────────────────────────────────────────────
  // SIDEBAR
  // ───────────────────────────────────────────────────────────────────────────

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  // ───────────────────────────────────────────────────────────────────────────
  // STOP CAMERA
  // ───────────────────────────────────────────────────────────────────────────

  const stopCamera = () => {
    try {
      if (readerRef.current) {
        try {
          readerRef.current.reset()
        } catch (error) {
          console.warn(
            "ZXing reader reset failed:",
            error
          )
        }

        readerRef.current = null
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop()
          })

        streamRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
    } catch (error) {
      console.warn(
        "Unable to completely stop camera:",
        error
      )
    }

    setFlashOn(false)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VALIDATE BARCODE
  // ───────────────────────────────────────────────────────────────────────────

  const validateBarcode = (
    barcode: string
  ) => {
    const value = barcode.trim()

    if (!value) {
      return {
        valid: false,
        message:
          "Please enter a barcode number.",
      }
    }

    /*
     * Food product barcodes commonly use:
     * EAN-8  = 8 digits
     * UPC-A  = 12 digits
     * EAN-13 = 13 digits
     * GTIN-14 = 14 digits
     *
     * This prevents random text from being sent
     * to the backend.
     */

    if (!/^\d+$/.test(value)) {
      return {
        valid: false,
        message:
          "Barcode must contain numbers only.",
      }
    }

    if (
      ![8, 12, 13, 14].includes(
        value.length
      )
    ) {
      return {
        valid: false,
        message:
          "Please enter a valid 8, 12, 13, or 14-digit product barcode.",
      }
    }

    return {
      valid: true,
      message: "",
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DUPLICATE SCAN PROTECTION
  // ───────────────────────────────────────────────────────────────────────────

  const isDuplicateScan = (
    barcode: string
  ) => {
    const now = Date.now()

    const sameBarcode =
      lastScannedBarcodeRef.current ===
      barcode

    const scannedRecently =
      now - lastScanTimeRef.current <
      5000

    return (
      sameBarcode &&
      scannedRecently
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NORMALIZE BACKEND RESULT
  // ───────────────────────────────────────────────────────────────────────────

  const normalizeProductResult = (
    result: any,
    barcode: string
  ): ProductResult => {
    /*
     * The frontend intentionally does not call
     * OpenFoodFacts directly.
     *
     * Everything displayed comes from the
     * backend response.
     */

    return {
      ...result,

      barcode:
        result?.barcode ||
        barcode,

      productInformation:
        result?.productInformation ||
        result?.product_information ||
        result?.product ||
        {},

      product:
        result?.product ||
        result?.productInformation ||
        {},

      ingredients:
        result?.ingredients ||
        result?.product?.ingredients ||
        result?.product?.ingredients_text ||
        result?.productInformation?.ingredients ||
        "",

      nutrition:
        result?.nutrition ||
        result?.nutriments ||
        result?.product?.nutrition ||
        {},
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOOKUP BARCODE THROUGH BACKEND
  // ───────────────────────────────────────────────────────────────────────────

  const lookupBarcode = async (
    barcode: string
  ) => {
    const cleanBarcode =
      barcode.trim()

    try {
      const response =
        await fetch(
          BACKEND_API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              barcode:
                cleanBarcode,
            }),
          }
        )

      let data: any = null

      try {
        data =
          await response.json()
      } catch {
        data = null
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRODUCT NOT FOUND
      // ───────────────────────────────────────────────────────────────────────

      if (
        response.status === 404 ||
        data?.found === false ||
        data?.productFound === false ||
        data?.product_found === false ||
        data?.status ===
          "not_found"
      ) {
        throw new Error(
          "__PRODUCT_NOT_FOUND__"
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // VALIDATION ERROR
      // ───────────────────────────────────────────────────────────────────────

      if (
        response.status === 400 ||
        response.status === 422
      ) {
        throw new Error(
          data?.message ||
            data?.error ||
            "The barcode sent to the server is invalid."
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // SERVER ERROR
      // ───────────────────────────────────────────────────────────────────────

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "The server could not retrieve the product information."
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // EMPTY RESPONSE
      // ───────────────────────────────────────────────────────────────────────

      if (!data) {
        throw new Error(
          "The server returned an empty response."
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // OTHER NOT-FOUND STRUCTURES
      // ───────────────────────────────────────────────────────────────────────

      if (
        data?.product === null ||
        data?.productInformation ===
          null ||
        data?.data === null
      ) {
        throw new Error(
          "__PRODUCT_NOT_FOUND__"
        )
      }

      return data
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "__PRODUCT_NOT_FOUND__"
      ) {
        throw error
      }

      /*
       * fetch() usually throws TypeError for
       * network connection problems.
       */
      if (
        error instanceof TypeError
      ) {
        throw new Error(
          "__NETWORK_ERROR__"
        )
      }

      throw error
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PROCESS BARCODE
  //
  // CAMERA AND MANUAL INPUT BOTH USE THIS FUNCTION
  // ───────────────────────────────────────────────────────────────────────────

  const processBarcode = async (
    barcode: string
  ) => {
    const cleanBarcode =
      barcode.trim()

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATE
    // ─────────────────────────────────────────────────────────────────────────

    const validation =
      validateBarcode(
        cleanBarcode
      )

    if (!validation.valid) {
      setErrorMessage(
        validation.message
      )

      setScanStatus("invalid")

      return
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DUPLICATE PROTECTION
    // ─────────────────────────────────────────────────────────────────────────

    if (
      isDuplicateScan(
        cleanBarcode
      )
    ) {
      return
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALREADY PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    if (processingRef.current) {
      return
    }

    processingRef.current = true

    lastScannedBarcodeRef.current =
      cleanBarcode

    lastScanTimeRef.current =
      Date.now()

    try {
      setErrorMessage("")

      setBarcodeValue(
        cleanBarcode
      )

      setManualBarcode(
        cleanBarcode
      )

      // ───────────────────────────────────────────────────────────────────────
      // BARCODE DETECTED
      // ───────────────────────────────────────────────────────────────────────

      setScanStatus("captured")

      stopCamera()

      // Short visual confirmation
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      )

      if (!isMountedRef.current) {
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // BACKEND LOOKUP
      // ───────────────────────────────────────────────────────────────────────

      setScanStatus("processing")

      const result =
        await lookupBarcode(
          cleanBarcode
        )

      if (!isMountedRef.current) {
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // SUCCESS
      // ───────────────────────────────────────────────────────────────────────

      const normalized =
        normalizeProductResult(
          result,
          cleanBarcode
        )

      setProductResult(
        normalized
      )

      try {
        localStorage.setItem(
          "scanityProductResult",
          JSON.stringify(
            normalized
          )
        )

        localStorage.setItem(
          "scanityLastBarcode",
          cleanBarcode
        )
      } catch (storageError) {
        console.warn(
          "Unable to save scan result:",
          storageError
        )
      }

      setScanStatus("success")

      // Give the success state a short time
      // to be visible before opening Product Result.
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      )

      if (
        isMountedRef.current
      ) {
        go(
          "productResult"
        )
      }
    } catch (error) {
      console.error(
        "Barcode processing error:",
        error
      )

      if (
        !isMountedRef.current
      ) {
        return
      }

      stopCamera()

      // ───────────────────────────────────────────────────────────────────────
      // PRODUCT NOT FOUND
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof Error &&
        error.message ===
          "__PRODUCT_NOT_FOUND__"
      ) {
        setErrorMessage(
          "We couldn't find a product for this barcode."
        )

        setScanStatus(
          "not-found"
        )

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // NETWORK ERROR
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof Error &&
        error.message ===
          "__NETWORK_ERROR__"
      ) {
        setErrorMessage(
          "Unable to connect to the server. Please check your internet connection and try again."
        )

        setScanStatus(
          "network-error"
        )

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // SERVER ERROR
      // ───────────────────────────────────────────────────────────────────────

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while looking up the product."
      )

      setScanStatus("error")
    } finally {
      processingRef.current =
        false
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // START CAMERA
  // ───────────────────────────────────────────────────────────────────────────

  const startCamera = async (
    requestedFacing?:
      | "environment"
      | "user"
  ) => {
    if (
      processingRef.current
    ) {
      return
    }

    try {
      setErrorMessage("")
      setBarcodeValue("")
      setGalleryImage(null)
      setFlashOn(false)

      // Reset duplicate protection
      lastScannedBarcodeRef.current =
        ""

      lastScanTimeRef.current =
        0

      // ───────────────────────────────────────────────────────────────────────
      // CAMERA LOADING
      // ───────────────────────────────────────────────────────────────────────

      setScanStatus(
        "camera-loading"
      )

      stopCamera()

      // ───────────────────────────────────────────────────────────────────────
      // SECURE CONTEXT
      // ───────────────────────────────────────────────────────────────────────

      if (
        !window.isSecureContext
      ) {
        throw new Error(
          "__UNSUPPORTED_CAMERA__"
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // MEDIA DEVICES
      // ───────────────────────────────────────────────────────────────────────

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "__UNSUPPORTED_CAMERA__"
        )
      }

      // ───────────────────────────────────────────────────────────────────────
      // VIDEO ELEMENT
      // ───────────────────────────────────────────────────────────────────────

      if (!videoRef.current) {
        throw new Error(
          "Camera preview could not be initialized."
        )
      }

      const facing =
        requestedFacing ||
        cameraFacing

      // ───────────────────────────────────────────────────────────────────────
      // CREATE ZXING READER
      // ───────────────────────────────────────────────────────────────────────

      const reader =
        new BrowserMultiFormatReader()

      readerRef.current =
        reader

      // ───────────────────────────────────────────────────────────────────────
      // ZXING CAMERA SCAN
      // ───────────────────────────────────────────────────────────────────────

      await reader.decodeFromConstraints(
        {
          video: {
            facingMode: {
              ideal: facing,
            },

            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },
          },

          audio: false,
        },
        videoRef.current,
        async (
          result,
          error,
          controls
        ) => {
          // ───────────────────────────────────────────────────────────────────
          // BARCODE FOUND
          // ───────────────────────────────────────────────────────────────────

          if (result) {
            const value =
              result
                .getText()
                .trim()

            if (!value) {
              return
            }

            // Stop continuous detection immediately
            try {
              controls.stop()
            } catch {
              // ignore
            }

            // Same processing flow as manual input
            await processBarcode(
              value
            )

            return
          }

          // ZXing continuously reports decoding
          // attempts. We intentionally don't show
          // an error for every unsuccessful frame.
          if (error) {
            // Ignore normal "not found" decoding
            // attempts.
            return
          }
        }
      )

      if (
        !isMountedRef.current
      ) {
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // GET ACTIVE STREAM
      // ───────────────────────────────────────────────────────────────────────

      const video =
        videoRef.current

      if (
        video &&
        video.srcObject instanceof
          MediaStream
      ) {
        streamRef.current =
          video.srcObject
      }

      // Some browsers don't immediately expose
      // srcObject through the reader callback.
      if (
        !streamRef.current &&
        video?.srcObject
      ) {
        streamRef.current =
          video.srcObject as MediaStream
      }

      // ───────────────────────────────────────────────────────────────────────
      // SCANNING STATE
      // ───────────────────────────────────────────────────────────────────────

      if (
        !processingRef.current
      ) {
        setScanStatus(
          "scanning"
        )
      }
    } catch (error) {
      console.error(
        "Camera start error:",
        error
      )

      stopCamera()

      if (
        !isMountedRef.current
      ) {
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // PERMISSION DENIED
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof DOMException &&
        (
          error.name ===
            "NotAllowedError" ||
          error.name ===
            "PermissionDeniedError"
        )
      ) {
        setErrorMessage(
          "Camera permission was denied. Please allow camera access in your browser settings and try again."
        )

        setScanStatus(
          "permission-denied"
        )

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // CAMERA ALREADY IN USE
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof DOMException &&
        error.name ===
          "NotReadableError"
      ) {
        setErrorMessage(
          "The camera is already being used by another application or browser tab."
        )

        setScanStatus("error")

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // CAMERA NOT FOUND
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof DOMException &&
        error.name ===
          "NotFoundError"
      ) {
        setErrorMessage(
          "No camera was found on this device."
        )

        setScanStatus("error")

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // UNSUPPORTED
      // ───────────────────────────────────────────────────────────────────────

      if (
        error instanceof Error &&
        error.message ===
          "__UNSUPPORTED_CAMERA__"
      ) {
        setErrorMessage(
          "Camera access is not supported here. Open Scanity using localhost or HTTPS and use a modern browser such as Chrome, Edge, or Safari."
        )

        setScanStatus(
          "unsupported"
        )

        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // GENERIC CAMERA ERROR
      // ───────────────────────────────────────────────────────────────────────

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Camera access could not be started."
      )

      setScanStatus("error")
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROTATE CAMERA
  // ───────────────────────────────────────────────────────────────────────────

  const rotateCamera = async () => {
    const nextFacing =
      cameraFacing ===
      "environment"
        ? "user"
        : "environment"

    setCameraFacing(
      nextFacing
    )

    if (
      scanStatus ===
        "scanning" ||
      scanStatus ===
        "camera-loading"
    ) {
      await startCamera(
        nextFacing
      )
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FLASH
  // ───────────────────────────────────────────────────────────────────────────

  const toggleFlash = async () => {
    const stream =
      streamRef.current

    if (!stream) {
      setErrorMessage(
        "Start the camera first before using the flash."
      )

      setScanStatus("error")

      return
    }

    const track =
      stream.getVideoTracks()[0]

    if (!track) {
      setErrorMessage(
        "No active camera track was found."
      )

      return
    }

    try {
      const capabilities =
        typeof track.getCapabilities ===
        "function"
          ? track.getCapabilities()
          : null

      if (
        !(capabilities as any)
          ?.torch
      ) {
        setErrorMessage(
          "Flash is not supported by this camera."
        )

        return
      }

      const nextFlash =
        !flashOn

      await track.applyConstraints({
        advanced: [
          {
            torch:
              nextFlash,
          } as any,
        ],
      })

      setFlashOn(
        nextFlash
      )

      setErrorMessage("")
    } catch (error) {
      console.error(
        "Flash error:",
        error
      )

      setErrorMessage(
        "The flash could not be controlled on this device."
      )
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MANUAL BARCODE
  // ───────────────────────────────────────────────────────────────────────────

  const handleManualScan = () => {
    const value =
      manualBarcode.trim()

    const validation =
      validateBarcode(value)

    if (!validation.valid) {
      setErrorMessage(
        validation.message
      )

      setScanStatus("invalid")

      return
    }

    // Same flow used by camera scanning
    processBarcode(value)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GALLERY
  // ───────────────────────────────────────────────────────────────────────────

  const handleGallery = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "Please select a valid image."
      )

      setScanStatus("invalid")

      return
    }

    if (
      galleryObjectUrlRef.current
    ) {
      URL.revokeObjectURL(
        galleryObjectUrlRef.current
      )
    }

    const imageUrl =
      URL.createObjectURL(file)

    galleryObjectUrlRef.current =
      imageUrl

    setGalleryImage(
      imageUrl
    )

    setErrorMessage("")

    /*
     * Gallery image is only displayed here.
     *
     * Barcode decoding still uses the camera
     * decoder. This keeps this Scanner feature
     * focused on camera + manual barcode input.
     */
    setScanStatus("ready")

    event.target.value = ""
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RETRY
  // ───────────────────────────────────────────────────────────────────────────

  const handleRetry = () => {
    stopCamera()

    processingRef.current =
      false

    lastScannedBarcodeRef.current =
      ""

    lastScanTimeRef.current =
      0

    setErrorMessage("")
    setBarcodeValue("")
    setManualBarcode("")
    setGalleryImage(null)
    setProductResult(null)

    setScanStatus("ready")
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RESCAN
  // ───────────────────────────────────────────────────────────────────────────

  const handleRescan = () => {
    stopCamera()

    processingRef.current =
      false

    lastScannedBarcodeRef.current =
      ""

    lastScanTimeRef.current =
      0

    setErrorMessage("")
    setBarcodeValue("")
    setGalleryImage(null)
    setProductResult(null)

    setScanStatus("ready")
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ───────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    setShowLogoutConfirm(
      false
    )

    setShowLogoutLoading(
      true
    )

    stopCamera()

    setTimeout(() => {
      setShowLogoutLoading(
        false
      )

      setSidebarOpen(false)

      go("splash")
    }, 1800)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current =
      true

    return () => {
      isMountedRef.current =
        false

      stopCamera()

      if (
        galleryObjectUrlRef.current
      ) {
        URL.revokeObjectURL(
          galleryObjectUrlRef.current
        )

        galleryObjectUrlRef.current =
          null
      }
    }
  }, [])

  // ───────────────────────────────────────────────────────────────────────────
  // STATUS TITLE
  // ───────────────────────────────────────────────────────────────────────────

  const getStatusTitle = () => {
    switch (scanStatus) {
      case "ready":
        return "Ready to scan"

      case "camera-loading":
        return "Starting camera..."

      case "scanning":
        return "Scanning barcode..."

      case "captured":
        return "Barcode captured"

      case "processing":
        return "Analyzing product..."

      case "success":
        return "Product found!"

      case "invalid":
        return "Invalid barcode"

      case "not-found":
        return "Product not found"

      case "permission-denied":
        return "Camera permission denied"

      case "unsupported":
        return "Camera unavailable"

      case "network-error":
        return "Connection problem"

      case "error":
        return "Unable to scan"

      default:
        return "Ready to scan"
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATUS DESCRIPTION
  // ───────────────────────────────────────────────────────────────────────────

  const getStatusDescription =
    () => {
      switch (scanStatus) {
        case "ready":
          return "Scan a food product barcode to get nutrition and allergy information."

        case "camera-loading":
          return "Please wait while Scanity starts your camera."

        case "scanning":
          return "Position the barcode inside the frame and keep it steady."

        case "captured":
          return barcodeValue
            ? `Barcode: ${barcodeValue}`
            : "Barcode successfully detected."

        case "processing":
          return "Getting product information from the Scanity backend."

        case "success":
          return productResult
            ?.productInformation
            ?.name
            ? `${productResult.productInformation.name} was found.`
            : "Product information was successfully retrieved."

        case "invalid":
          return (
            errorMessage ||
            "Please enter a valid product barcode."
          )

        case "not-found":
          return (
            errorMessage ||
            "No product information was found for this barcode."
          )

        case "permission-denied":
          return (
            errorMessage ||
            "Allow camera access in your browser settings and try again."
          )

        case "unsupported":
          return (
            errorMessage ||
            "Your current browser or connection does not support camera access."
          )

        case "network-error":
          return (
            errorMessage ||
            "Check your internet connection and try again."
          )

        case "error":
          return (
            errorMessage ||
            "Something went wrong while scanning."
          )

        default:
          return ""
      }
    }

  // ───────────────────────────────────────────────────────────────────────────
  // STATUS ICON
  // ───────────────────────────────────────────────────────────────────────────

  const getStatusIcon = () => {
    switch (scanStatus) {
      case "success":
      case "captured":
        return "fa-check"

      case "invalid":
        return "fa-exclamation"

      case "not-found":
        return "fa-search"

      case "permission-denied":
        return "fa-lock"

      case "unsupported":
        return "fa-video-camera"

      case "network-error":
        return "fa-wifi"

      case "error":
        return "fa-exclamation-triangle"

      default:
        return "fa-camera"
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SIDEBAR MENU
  // ───────────────────────────────────────────────────────────────────────────

  const sidebarMenu = (
    <>
      {/* LOGO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,

          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width:
              isDesktop
                ? 48
                : 42,

            height:
              isDesktop
                ? 48
                : 42,

            objectFit:
              "contain",

            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,

            fontSize:
              isDesktop
                ? 22
                : 18,

            letterSpacing:
              "-0.01em",

            lineHeight: 1,
            whiteSpace:
              "nowrap",
          }}
        >
          <span
            style={{
              color:
                "#FFFFFF",
            }}
          >
            Scan
          </span>

          <span
            style={{
              color:
                "#9CE6B8",
            }}
          >
            ity
          </span>
        </span>
      </div>

      {/* MENU TITLE */}

      <p
        style={{
          margin: 0,

          padding:
            isDesktop
              ? "0 20px 10px"
              : "0 16px 10px",

          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,

          letterSpacing:
            "0.14em",

          color:
            "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* MENU ITEMS */}

      <div
        style={{
          display: "flex",
          flexDirection:
            "column",
          gap: 6,

          padding:
            isDesktop
              ? "0 10px"
              : "0 9px",
        }}
      >
        {sidebarItems.map(
          (item) => (
            <button
              key={
                item.screen
              }
              type="button"
              className="scanity-sidebar-item"
              onClick={() => {
                stopCamera()

                setSidebarOpen(
                  false
                )

                go(
                  item.screen
                )
              }}
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 12,

                padding:
                  isDesktop
                    ? "12px 14px"
                    : "11px 12px",

                background:
                  "transparent",

                border: "none",
                borderRadius: 14,

                cursor:
                  "pointer",

                width: "100%",
                textAlign:
                  "left",
              }}
            >
              <i
                className={`fa ${item.icon}`}
                style={{
                  fontSize: 15,
                  width: 19,

                  textAlign:
                    "center",

                  color:
                    "#FFFFFF",
                }}
              />

              <span
                style={{
                  fontFamily:
                    FONT,

                  fontWeight: 500,

                  fontSize:
                    isDesktop
                      ? 13
                      : 12,

                  color:
                    "#FFFFFF",
                }}
              >
                {item.label}
              </span>
            </button>
          )
        )}

        {/* LOGOUT */}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() =>
            setShowLogoutConfirm(
              true
            )
          }
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 12,

            padding:
              isDesktop
                ? "12px 14px"
                : "11px 12px",

            background:
              "transparent",

            border: "none",
            borderRadius: 14,

            cursor:
              "pointer",

            width: "100%",
            textAlign:
              "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,

              textAlign:
                "center",

              color:
                "#FFFFFF",

              transform:
                "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily:
                FONT,

              fontWeight: 500,

              fontSize:
                isDesktop
                  ? 13
                  : 12,

              color:
                "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  // ───────────────────────────────────────────────────────────────────────────
  // MAIN
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,

        display: "flex",
        flexDirection:
          "column",

        position:
          "relative",

        overflow:
          "hidden",

        background:
          PALETTE.pageBg,

        fontFamily: FONT,
      }}
    >
      <style>
        {`
          @keyframes scanityScanLine {
            0% {
              top: 10%;
              opacity: 0.4;
            }

            50% {
              top: 85%;
              opacity: 1;
            }

            100% {
              top: 10%;
              opacity: 0.4;
            }
          }

          @keyframes scanitySpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanitySuccessPop {
            0% {
              transform: scale(0.7);
              opacity: 0;
            }

            70% {
              transform: scale(1.08);
              opacity: 1;
            }

            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background:
              rgba(255,255,255,0.10) !important;

            transform:
              translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform:
              scale(0.97);
          }

          .scanity-scanner-button {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease,
              background 0.15s ease;
          }

          .scanity-scanner-button:hover {
            transform:
              translateY(-2px);
          }

          .scanity-scanner-button:active {
            transform:
              scale(0.97);
          }

          .scanity-manual-input:focus {
            outline: none;

            border-color:
              #176B3A !important;

            box-shadow:
              0 0 0 3px
              rgba(23,107,58,0.12);
          }
        `}
      </style>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════════════════ */}

      {sidebarOpen && (
        <div
          style={{
            position:
              "absolute",

            inset: 0,

            zIndex: 50,

            display: "flex",
          }}
        >
          {/* BACKDROP */}

          <div
            onClick={() =>
              setSidebarOpen(
                false
              )
            }
            style={{
              position:
                "absolute",

              inset: 0,

              background:
                isDesktop
                  ? "transparent"
                  : "rgba(0,0,0,0.40)",

              backdropFilter:
                isDesktop
                  ? "none"
                  : "blur(4px)",

              WebkitBackdropFilter:
                isDesktop
                  ? "none"
                  : "blur(4px)",
            }}
          />

          {/* SIDEBAR */}

          <div
            style={{
              position:
                "relative",

              zIndex: 51,

              width:
                isDesktop
                  ? 205
                  : 220,

              height: `calc(100% - ${
                isDesktop
                  ? 32
                  : 20
              }px)`,

              margin:
                isDesktop
                  ? "16px 0 16px 8px"
                  : "10px",

              background: `linear-gradient(
                160deg,
                ${PALETTE.sidebarDark} 0%,
                ${PALETTE.sidebarBg} 48%,
                ${PALETTE.greenLight} 100%
              )`,

              borderRadius:
                "0 24px 24px 0",

              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",

              display:
                "flex",

              flexDirection:
                "column",

              paddingTop:
                SAFE_TOP,

              paddingBottom:
                24,

              boxSizing:
                "border-box",

              overflow:
                "hidden",

              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Decorative circle */}

            <div
              style={{
                position:
                  "absolute",

                width: 150,
                height: 150,

                borderRadius:
                  "50%",

                top: -85,
                right: -75,

                background:
                  "rgba(255,255,255,0.055)",

                pointerEvents:
                  "none",
              }}
            />

            <div
              style={{
                position:
                  "absolute",

                width: 115,
                height: 115,

                borderRadius:
                  "50%",

                bottom: 15,
                left: -70,

                background:
                  "rgba(255,255,255,0.035)",

                pointerEvents:
                  "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}

      <header
        style={{
          marginLeft:
            sidebarOpen &&
            isDesktop
              ? 205
              : 0,

          height:
            isDesktop
              ? 88
              : 68,

          flexShrink: 0,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          padding:
            isDesktop
              ? "0 28px"
              : "0 18px",

          boxSizing:
            "border-box",

          background:
            "transparent",

          zIndex: 20,
        }}
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 13,
          }}
        >
          {/* HAMBURGER */}

          <button
            type="button"
            className="scanity-hamburger scanity-scanner-button"
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
            style={{
              width: 42,
              height: 42,

              borderRadius: 15,

              border:
                `1px solid ${PALETTE.border}`,

              background:
                PALETTE.white,

              boxShadow:
                "0 6px 16px rgba(0,0,0,0.05)",

              padding: 0,

              color:
                PALETTE.green,

              cursor:
                "pointer",

              display:
                sidebarOpen &&
                isDesktop
                  ? "none"
                  : "flex",

              alignItems:
                "center",

              justifyContent:
                "center",
            }}
          >
            <div
              style={{
                width: 20,

                display:
                  "flex",

                flexDirection:
                  "column",

                gap: 5,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  width: 20,
                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  width: 20,
                  height: 2.5,

                  borderRadius: 5,

                  background:
                    PALETTE.textDark,
                }}
              />
            </div>
          </button>

          {/* TITLE */}

          <div>
            <h1
              style={{
                margin: 0,

                fontFamily: FONT,
                fontWeight: 800,

                fontSize:
                  isDesktop
                    ? 23
                    : 19,

                color:
                  PALETTE.textDark,

                lineHeight:
                  1.2,
              }}
            >
              Barcode Scanner
            </h1>

            <p
              style={{
                margin:
                  "4px 0 0",

                fontFamily:
                  FONT,

                fontSize:
                  isDesktop
                    ? 11
                    : 9,

                color:
                  PALETTE.textMuted,
              }}
            >
              Scan a food product barcode
            </p>
          </div>
        </div>

        {/* HELP */}

        <button
          type="button"
          className="scanity-scanner-button"
          onClick={() =>
            setShowHelp(true)
          }
          style={{
            width: 38,
            height: 38,

            borderRadius:
              "50%",

            border:
              `1px solid ${PALETTE.border}`,

            background:
              PALETTE.white,

            color:
              PALETTE.green,

            cursor:
              "pointer",
          }}
        >
          <i className="fa fa-question" />
        </button>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════════════════════════════ */}

      <main
        style={{
          marginLeft:
            sidebarOpen &&
            isDesktop
              ? 205
              : 0,

          flex: 1,

          overflowY:
            "auto",

          padding:
            isDesktop
              ? "8px 28px 32px"
              : "20px 16px 30px",

          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            width:
              "100%",

            maxWidth:
              isDesktop
                ? 1100
                : 760,

            margin:
              "0 auto",
          }}
        >
          {/* SCANNER CARD */}

          <section
            style={{
              background:
                PALETTE.white,

              border:
                `1px solid ${PALETTE.border}`,

              borderRadius:
                24,

              padding:
                isDesktop
                  ? 12
                  : 16,

              boxShadow:
                "0 8px 28px rgba(50,40,30,0.08)",
            }}
          >
            {/* ═══════════════════════════════════════════════════════════════
                CAMERA AREA
            ═══════════════════════════════════════════════════════════════ */}

            <div
              style={{
                position:
                  "relative",

                width:
                  "100%",

                maxWidth:
                  isDesktop
                    ? 900
                    : 640,

                height:
                  isDesktop
                    ? 520
                    : 285,

                margin:
                  "0 auto",

                background:
                  "#111111",

                borderRadius:
                  isDesktop
                    ? 8
                    : 20,

                overflow:
                  "hidden",
              }}
            >
              {/* VIDEO */}

              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                style={{
                  position:
                    "absolute",

                  inset: 0,

                  width:
                    "100%",

                  height:
                    "100%",

                  objectFit:
                    "cover",

                  transform:
                    cameraFacing ===
                    "user"
                      ? "scaleX(-1)"
                      : "none",

                  display:
                    scanStatus ===
                      "captured" ||
                    scanStatus ===
                      "processing" ||
                    scanStatus ===
                      "success"
                      ? "none"
                      : "block",
                }}
              />

              {/* GALLERY */}

              {galleryImage && (
                <img
                  src={
                    galleryImage
                  }
                  alt="Selected barcode"
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    width:
                      "100%",

                    height:
                      "100%",

                    objectFit:
                      "contain",

                    background:
                      "#111111",
                  }}
                />
              )}

              {/* ═════════════════════════════════════════════════════════════
                  READY STATE
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "ready" &&
                !galleryImage && (
                  <div
                    style={{
                      position:
                        "absolute",

                      inset: 0,

                      display:
                        "flex",

                      flexDirection:
                        "column",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      textAlign:
                        "center",

                      padding: 20,

                      color:
                        "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        width: 66,
                        height: 66,

                        borderRadius:
                          "50%",

                        background:
                          "rgba(255,255,255,0.12)",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        marginBottom:
                          14,
                      }}
                    >
                      <i
                        className="fa fa-camera"
                        style={{
                          fontSize: 27,
                        }}
                      />
                    </div>

                    <strong
                      style={{
                        fontSize:
                          16,
                      }}
                    >
                      Camera ready
                    </strong>

                    <span
                      style={{
                        marginTop:
                          7,

                        fontSize:
                          10,

                        color:
                          "rgba(255,255,255,0.7)",
                      }}
                    >
                      Tap Camera to begin
                    </span>
                  </div>
                )}

              {/* ═════════════════════════════════════════════════════════════
                  CAMERA LOADING
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "camera-loading" && (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "rgba(0,0,0,0.88)",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    textAlign:
                      "center",

                    color:
                      "#FFFFFF",
                  }}
                >
                  <div
                    style={{
                      width: 45,
                      height: 45,

                      borderRadius:
                        "50%",

                      border:
                        "4px solid rgba(255,255,255,0.25)",

                      borderTopColor:
                        PALETTE.greenLight,

                      animation:
                        "scanitySpin 0.8s linear infinite",

                      marginBottom:
                        15,
                    }}
                  />

                  <strong
                    style={{
                      fontSize:
                        16,
                    }}
                  >
                    Starting camera...
                  </strong>

                  <span
                    style={{
                      marginTop:
                        7,

                      fontSize:
                        10,

                      color:
                        "rgba(255,255,255,0.7)",
                    }}
                  >
                    Please allow camera access if requested.
                  </span>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  SCANNING FRAME
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "scanning" && (
                <>
                  <div
                    style={{
                      position:
                        "absolute",

                      left: "50%",
                      top: "50%",

                      width:
                        isDesktop
                          ? "68%"
                          : "76%",

                      height:
                        isDesktop
                          ? "45%"
                          : "42%",

                      transform:
                        "translate(-50%, -50%)",

                      border:
                        "2px solid rgba(255,255,255,0.9)",

                      borderRadius:
                        18,

                      boxShadow:
                        "0 0 0 9999px rgba(0,0,0,0.32)",
                    }}
                  >
                    {/* CORNERS */}

                    <span
                      style={{
                        position:
                          "absolute",

                        left: -2,
                        top: -2,

                        width: 32,
                        height: 32,

                        borderTop:
                          `4px solid ${PALETTE.yellow}`,

                        borderLeft:
                          `4px solid ${PALETTE.yellow}`,

                        borderRadius:
                          "10px 0 0 0",
                      }}
                    />

                    <span
                      style={{
                        position:
                          "absolute",

                        right: -2,
                        top: -2,

                        width: 32,
                        height: 32,

                        borderTop:
                          `4px solid ${PALETTE.yellow}`,

                        borderRight:
                          `4px solid ${PALETTE.yellow}`,

                        borderRadius:
                          "0 10px 0 0",
                      }}
                    />

                    <span
                      style={{
                        position:
                          "absolute",

                        left: -2,
                        bottom: -2,

                        width: 32,
                        height: 32,

                        borderBottom:
                          `4px solid ${PALETTE.yellow}`,

                        borderLeft:
                          `4px solid ${PALETTE.yellow}`,

                        borderRadius:
                          "0 0 0 10px",
                      }}
                    />

                    <span
                      style={{
                        position:
                          "absolute",

                        right: -2,
                        bottom: -2,

                        width: 32,
                        height: 32,

                        borderBottom:
                          `4px solid ${PALETTE.yellow}`,

                        borderRight:
                          `4px solid ${PALETTE.yellow}`,

                        borderRadius:
                          "0 0 10px 0",
                      }}
                    />

                    {/* SCAN LINE */}

                    <span
                      style={{
                        position:
                          "absolute",

                        left:
                          "4%",

                        right:
                          "4%",

                        height: 2,

                        background:
                          PALETTE.yellow,

                        boxShadow:
                          "0 0 10px rgba(224,167,46,0.9)",

                        animation:
                          "scanityScanLine 2s ease-in-out infinite",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      position:
                        "absolute",

                      bottom: 18,

                      left: 0,
                      right: 0,

                      textAlign:
                        "center",

                      color:
                        "#FFFFFF",

                      fontSize: 10,

                      fontWeight: 600,

                      textShadow:
                        "0 1px 5px rgba(0,0,0,0.8)",
                    }}
                  >
                    Position the barcode inside the frame
                  </div>
                </>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  CAPTURED
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "captured" && (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "rgba(23,107,58,0.96)",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    color:
                      "#FFFFFF",

                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      width: 70,
                      height: 70,

                      borderRadius:
                        "50%",

                      background:
                        "#FFFFFF",

                      color:
                        PALETTE.green,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      marginBottom:
                        14,

                      animation:
                        "scanitySuccessPop 0.35s ease both",
                    }}
                  >
                    <i
                      className="fa fa-check"
                      style={{
                        fontSize:
                          34,
                      }}
                    />
                  </div>

                  <strong
                    style={{
                      fontSize:
                        18,
                    }}
                  >
                    Barcode Captured
                  </strong>

                  <span
                    style={{
                      marginTop:
                        7,

                      fontSize:
                        12,

                      opacity:
                        0.9,
                    }}
                  >
                    {barcodeValue}
                  </span>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  BACKEND PROCESSING
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "processing" && (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "rgba(255,255,255,0.97)",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      width: 45,
                      height: 45,

                      borderRadius:
                        "50%",

                      border:
                        `4px solid ${PALETTE.border}`,

                      borderTopColor:
                        PALETTE.green,

                      animation:
                        "scanitySpin 0.8s linear infinite",

                      marginBottom:
                        15,
                    }}
                  />

                  <strong
                    style={{
                      fontSize:
                        16,

                      color:
                        PALETTE.textDark,
                    }}
                  >
                    Analyzing product...
                  </strong>

                  <span
                    style={{
                      maxWidth:
                        390,

                      marginTop:
                        7,

                      padding:
                        "0 20px",

                      fontSize:
                        10,

                      lineHeight:
                        1.6,

                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    Getting real product information from the Scanity backend.
                  </span>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  SUCCESS
              ═════════════════════════════════════════════════════════════ */}

              {scanStatus ===
                "success" && (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "rgba(23,107,58,0.96)",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    color:
                      "#FFFFFF",

                    textAlign:
                      "center",

                    padding:
                      20,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,

                      borderRadius:
                        "50%",

                      background:
                        "#FFFFFF",

                      color:
                        PALETTE.green,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      marginBottom:
                        14,

                      animation:
                        "scanitySuccessPop 0.35s ease both",
                    }}
                  >
                    <i
                      className="fa fa-check"
                      style={{
                        fontSize:
                          36,
                      }}
                    />
                  </div>

                  <strong
                    style={{
                      fontSize:
                        18,
                    }}
                  >
                    Product Found!
                  </strong>

                  <span
                    style={{
                      marginTop:
                        8,

                      fontSize:
                        11,

                      opacity:
                        0.9,
                    }}
                  >
                    Opening product information...
                  </span>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  ERROR STATES
              ═════════════════════════════════════════════════════════════ */}

              {[
                "invalid",
                "not-found",
                "permission-denied",
                "unsupported",
                "network-error",
                "error",
              ].includes(
                scanStatus
              ) && (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "rgba(255,255,255,0.97)",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    textAlign:
                      "center",

                    padding:
                      25,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,

                      borderRadius:
                        "50%",

                      background:
                        scanStatus ===
                          "not-found"
                          ? PALETTE.blueSoft
                          : PALETTE.redSoft,

                      color:
                        scanStatus ===
                          "not-found"
                          ? PALETTE.blue
                          : PALETTE.red,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      marginBottom:
                        13,
                    }}
                  >
                    <i
                      className={`fa ${getStatusIcon()}`}
                      style={{
                        fontSize:
                          24,
                      }}
                    />
                  </div>

                  <strong
                    style={{
                      fontSize:
                        16,

                      color:
                        PALETTE.textDark,
                    }}
                  >
                    {getStatusTitle()}
                  </strong>

                  <span
                    style={{
                      maxWidth:
                        440,

                      marginTop:
                        8,

                      fontSize:
                        10,

                      lineHeight:
                        1.6,

                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    {getStatusDescription()}
                  </span>

                  {/* RETRY */}

                  <button
                    type="button"
                    onClick={
                      handleRetry
                    }
                    style={{
                      marginTop:
                        17,

                      padding:
                        "10px 19px",

                      border:
                        "none",

                      borderRadius:
                        12,

                      background:
                        PALETTE.green,

                      color:
                        PALETTE.white,

                      fontFamily:
                        FONT,

                      fontWeight:
                        700,

                      fontSize:
                        11,

                      cursor:
                        "pointer",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                STATUS
            ═══════════════════════════════════════════════════════════════ */}

            <div
              style={{
                textAlign:
                  "center",

                marginTop:
                  19,
              }}
            >
              <h2
                style={{
                  margin: 0,

                  fontFamily:
                    FONT,

                  fontWeight:
                    800,

                  fontSize:
                    isDesktop
                      ? 19
                      : 17,

                  color:
                    PALETTE.textDark,
                }}
              >
                {getStatusTitle()}
              </h2>

              <p
                style={{
                  maxWidth:
                    530,

                  margin:
                    "7px auto 0",

                  fontFamily:
                    FONT,

                  fontSize:
                    10,

                  lineHeight:
                    1.6,

                  color:
                    PALETTE.textMuted,
                }}
              >
                {getStatusDescription()}
              </p>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                CONTROLS
            ═══════════════════════════════════════════════════════════════ */}

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(4, 1fr)",

                gap: 9,

                maxWidth:
                  560,

                margin:
                  "20px auto 0",
              }}
            >
              {/* CAMERA */}

              <button
                type="button"
                className="scanity-scanner-button"
                onClick={() =>
                  startCamera()
                }
                disabled={
                  scanStatus ===
                    "processing" ||
                  scanStatus ===
                    "captured" ||
                  scanStatus ===
                    "success"
                }
                style={{
                  border:
                    `1px solid ${PALETTE.border}`,

                  background:
                    PALETTE.white,

                  borderRadius:
                    14,

                  padding:
                    isDesktop
                      ? "13px 8px"
                      : "11px 5px",

                  color:
                    PALETTE.green,

                  cursor:
                    "pointer",

                  opacity:
                    scanStatus ===
                      "processing" ||
                    scanStatus ===
                      "captured" ||
                    scanStatus ===
                      "success"
                      ? 0.5
                      : 1,
                }}
              >
                <i
                  className="fa fa-camera"
                  style={{
                    fontSize:
                      17,
                  }}
                />

                <div
                  style={{
                    marginTop:
                      6,

                    fontFamily:
                      FONT,

                    fontWeight:
                      600,

                    fontSize:
                      9,
                  }}
                >
                  Camera
                </div>
              </button>

              {/* ROTATE */}

              <button
                type="button"
                className="scanity-scanner-button"
                onClick={
                  rotateCamera
                }
                style={{
                  border:
                    `1px solid ${PALETTE.border}`,

                  background:
                    PALETTE.white,

                  borderRadius:
                    14,

                  padding:
                    isDesktop
                      ? "13px 8px"
                      : "11px 5px",

                  color:
                    PALETTE.green,

                  cursor:
                    "pointer",
                }}
              >
                <i
                  className="fa fa-refresh"
                  style={{
                    fontSize:
                      17,
                  }}
                />

                <div
                  style={{
                    marginTop:
                      6,

                    fontFamily:
                      FONT,

                    fontWeight:
                      600,

                    fontSize:
                      9,
                  }}
                >
                  Rotate Camera
                </div>
              </button>

              {/* GALLERY */}

              <label
                className="scanity-scanner-button"
                style={{
                  border:
                    `1px solid ${PALETTE.border}`,

                  background:
                    PALETTE.white,

                  borderRadius:
                    14,

                  padding:
                    isDesktop
                      ? "13px 8px"
                      : "11px 5px",

                  color:
                    PALETTE.green,

                  cursor:
                    "pointer",

                  textAlign:
                    "center",
                }}
              >
                <i
                  className="fa fa-picture-o"
                  style={{
                    fontSize:
                      17,
                  }}
                />

                <div
                  style={{
                    marginTop:
                      6,

                    fontFamily:
                      FONT,

                    fontWeight:
                      600,

                    fontSize:
                      9,
                  }}
                >
                  Gallery
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleGallery
                  }
                  style={{
                    display:
                      "none",
                  }}
                />
              </label>

              {/* FLASH */}

              <button
                type="button"
                className="scanity-scanner-button"
                onClick={
                  toggleFlash
                }
                style={{
                  border:
                    `1px solid ${
                      flashOn
                        ? PALETTE.yellow
                        : PALETTE.border
                    }`,

                  background:
                    flashOn
                      ? "#FFF6DD"
                      : PALETTE.white,

                  borderRadius:
                    14,

                  padding:
                    isDesktop
                      ? "13px 8px"
                      : "11px 5px",

                  color:
                    flashOn
                      ? "#C98A1F"
                      : PALETTE.green,

                  cursor:
                    "pointer",
                }}
              >
                <i
                  className="fa fa-bolt"
                  style={{
                    fontSize:
                      17,
                  }}
                />

                <div
                  style={{
                    marginTop:
                      6,

                    fontFamily:
                      FONT,

                    fontWeight:
                      600,

                    fontSize:
                      9,
                  }}
                >
                  Flash
                </div>
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                START CAMERA
            ═══════════════════════════════════════════════════════════════ */}

            {scanStatus !==
              "scanning" &&
              scanStatus !==
                "captured" &&
              scanStatus !==
                "processing" &&
              scanStatus !==
                "camera-loading" &&
              scanStatus !==
                "success" && (
                <button
                  type="button"
                  className="scanity-scanner-button"
                  onClick={() =>
                    startCamera()
                  }
                  style={{
                    display:
                      "block",

                    width:
                      "100%",

                    maxWidth:
                      560,

                    margin:
                      "18px auto 0",

                    padding:
                      15,

                    border:
                      "none",

                    borderRadius:
                      15,

                    background:
                      PALETTE.green,

                    color:
                      PALETTE.white,

                    fontFamily:
                      FONT,

                    fontWeight:
                      700,

                    fontSize:
                      13,

                    cursor:
                      "pointer",

                    boxShadow:
                      "0 7px 20px rgba(23,107,58,0.22)",
                  }}
                >
                  <i
                    className="fa fa-camera"
                    style={{
                      marginRight:
                        8,
                    }}
                  />

                  Start Camera
                </button>
              )}

            {/* ═══════════════════════════════════════════════════════════════
                RESCAN
            ═══════════════════════════════════════════════════════════════ */}

            {(scanStatus ===
              "success" ||
              scanStatus ===
                "not-found") && (
              <button
                type="button"
                onClick={
                  handleRescan
                }
                style={{
                  display:
                    "block",

                  width:
                    "100%",

                  maxWidth:
                    560,

                  margin:
                    "18px auto 0",

                  padding:
                    14,

                  border:
                    `1px solid ${PALETTE.green}`,

                  borderRadius:
                    15,

                  background:
                    PALETTE.white,

                  color:
                    PALETTE.green,

                  fontFamily:
                    FONT,

                  fontWeight:
                    700,

                  fontSize:
                    12,

                  cursor:
                    "pointer",
                }}
              >
                <i
                  className="fa fa-refresh"
                  style={{
                    marginRight:
                      7,
                  }}
                />

                Scan Another Product
              </button>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MANUAL BARCODE
            ═══════════════════════════════════════════════════════════════ */}

            <div
              style={{
                maxWidth:
                  560,

                margin:
                  "24px auto 0",

                paddingTop:
                  20,

                borderTop:
                  `1px solid ${PALETTE.border}`,
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: 8,

                  marginBottom:
                    9,
                }}
              >
                <i
                  className="fa fa-keyboard-o"
                  style={{
                    color:
                      PALETTE.green,

                    fontSize:
                      14,
                  }}
                />

                <span
                  style={{
                    fontFamily:
                      FONT,

                    fontWeight:
                      700,

                    fontSize:
                      11,

                    color:
                      PALETTE.textDark,
                  }}
                >
                  Enter barcode manually
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",

                  gap: 8,
                }}
              >
                <input
                  className="scanity-manual-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  value={
                    manualBarcode
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target
                        .value

                    /*
                     * Keep numeric characters only.
                     */
                    const numeric =
                      value.replace(
                        /\D/g,
                        ""
                      )

                    setManualBarcode(
                      numeric
                    )

                    if (
                      scanStatus ===
                        "invalid" ||
                      scanStatus ===
                        "error" ||
                      scanStatus ===
                        "network-error"
                    ) {
                      setErrorMessage(
                        ""
                      )

                      setScanStatus(
                        "ready"
                      )
                    }
                  }}
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleManualScan()
                    }
                  }}
                  placeholder="e.g. 4800012345678"
                  style={{
                    flex: 1,

                    minWidth: 0,

                    height: 46,

                    boxSizing:
                      "border-box",

                    border:
                      `1px solid ${PALETTE.border}`,

                    borderRadius:
                      12,

                    background:
                      "#F8F6F2",

                    padding:
                      "0 13px",

                    fontFamily:
                      FONT,

                    fontSize:
                      11,

                    color:
                      PALETTE.textDark,
                  }}
                />

                <button
                  type="button"
                  onClick={
                    handleManualScan
                  }
                  disabled={
                    scanStatus ===
                      "processing" ||
                    scanStatus ===
                      "captured" ||
                    scanStatus ===
                      "camera-loading"
                  }
                  style={{
                    height: 46,

                    padding:
                      "0 18px",

                    border:
                      "none",

                    borderRadius:
                      12,

                    background:
                      PALETTE.green,

                    color:
                      PALETTE.white,

                    fontFamily:
                      FONT,

                    fontWeight:
                      700,

                    fontSize:
                      11,

                    cursor:
                      "pointer",

                    opacity:
                      scanStatus ===
                        "processing" ||
                      scanStatus ===
                        "captured" ||
                      scanStatus ===
                        "camera-loading"
                        ? 0.5
                        : 1,
                  }}
                >
                  Scan
                </button>
              </div>

              {/* VALIDATION MESSAGE */}

              {scanStatus ===
                "invalid" && (
                <p
                  style={{
                    margin:
                      "8px 0 0",

                    fontFamily:
                      FONT,

                    fontSize:
                      9,

                    color:
                      PALETTE.red,

                    lineHeight:
                      1.5,
                  }}
                >
                  <i
                    className="fa fa-exclamation-circle"
                    style={{
                      marginRight:
                        5,
                    }}
                  />

                  {errorMessage}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          HELP MODAL
      ══════════════════════════════════════════════════════════════════════ */}

      {showHelp && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.45)",

            zIndex: 200,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding: 20,
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                430,

              background:
                PALETTE.white,

              borderRadius:
                22,

              padding:
                24,

              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                marginBottom:
                  18,
              }}
            >
              <h3
                style={{
                  margin: 0,

                  fontFamily:
                    FONT,

                  fontWeight:
                    800,

                  fontSize:
                    18,

                  color:
                    PALETTE.textDark,
                }}
              >
                How to scan
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowHelp(
                    false
                  )
                }
                style={{
                  width: 34,
                  height: 34,

                  borderRadius:
                    "50%",

                  border:
                    "none",

                  background:
                    "#F3F1ED",

                  cursor:
                    "pointer",
                }}
              >
                <i className="fa fa-times" />
              </button>
            </div>

            {[
              "Tap Camera or Start Camera.",
              "Allow camera permission when your browser asks.",
              "Place the barcode inside the scanning frame.",
              "Keep the barcode steady until it is detected.",
              "Scanity will validate the barcode.",
              "The barcode will be sent to the backend.",
              "The backend retrieves product information from OpenFoodFacts.",
              "The Product Result page will display the returned information.",
            ].map(
              (
                instruction,
                index
              ) => (
                <div
                  key={
                    instruction
                  }
                  style={{
                    display:
                      "flex",

                    gap: 11,

                    marginBottom:
                      12,
                  }}
                >
                  <div
                    style={{
                      width: 25,
                      height: 25,

                      flexShrink: 0,

                      borderRadius:
                        "50%",

                      background:
                        PALETTE.greenSoft,

                      color:
                        PALETTE.green,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      fontSize:
                        10,

                      fontWeight:
                        800,
                    }}
                  >
                    {index + 1}
                  </div>

                  <span
                    style={{
                      fontFamily:
                        FONT,

                      fontSize:
                        10,

                      lineHeight:
                        1.6,

                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    {
                      instruction
                    }
                  </span>
                </div>
              )
            )}

            <button
              type="button"
              onClick={() =>
                setShowHelp(
                  false
                )
              }
              style={{
                width:
                  "100%",

                marginTop:
                  8,

                padding:
                  13,

                border:
                  "none",

                borderRadius:
                  13,

                background:
                  PALETTE.green,

                color:
                  PALETTE.white,

                fontFamily:
                  FONT,

                fontWeight:
                  700,

                fontSize:
                  11,

                cursor:
                  "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOGOUT CONFIRMATION
      ══════════════════════════════════════════════════════════════════════ */}

      {showLogoutConfirm && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.45)",

            zIndex: 210,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding: 20,
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                390,

              background:
                PALETTE.white,

              borderRadius:
                22,

              padding:
                24,

              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,

                borderRadius:
                  "50%",

                background:
                  PALETTE.redSoft,

                color:
                  PALETTE.red,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                margin:
                  "0 auto 14px",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize:
                    22,
                }}
              />
            </div>

            <h3
              style={{
                margin: 0,

                fontFamily:
                  FONT,

                fontWeight:
                  800,

                fontSize:
                  17,

                color:
                  PALETTE.textDark,
              }}
            >
              Are you sure you want to logout?
            </h3>

            <p
              style={{
                margin:
                  "8px 0 20px",

                fontFamily:
                  FONT,

                fontSize:
                  10,

                lineHeight:
                  1.6,

                color:
                  PALETTE.textMuted,
              }}
            >
              You will be returned to the login screen.
            </p>

            <div
              style={{
                display:
                  "flex",

                gap: 9,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(
                    false
                  )
                }
                style={{
                  flex: 1,

                  padding:
                    13,

                  border:
                    `1px solid ${PALETTE.border}`,

                  borderRadius:
                    13,

                  background:
                    PALETTE.white,

                  color:
                    PALETTE.textDark,

                  fontFamily:
                    FONT,

                  fontWeight:
                    700,

                  fontSize:
                    11,

                  cursor:
                    "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                style={{
                  flex: 1,

                  padding:
                    13,

                  border:
                    "none",

                  borderRadius:
                    13,

                  background:
                    PALETTE.red,

                  color:
                    PALETTE.white,

                  fontFamily:
                    FONT,

                  fontWeight:
                    700,

                  fontSize:
                    11,

                  cursor:
                    "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOGOUT LOADING
      ══════════════════════════════════════════════════════════════════════ */}

      {showLogoutLoading && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.55)",

            zIndex: 220,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",
          }}
        >
          <div
            style={{
              width:
                260,

              background:
                PALETTE.white,

              borderRadius:
                20,

              padding:
                25,

              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,

                borderRadius:
                  "50%",

                border:
                  `4px solid ${PALETTE.border}`,

                borderTopColor:
                  PALETTE.green,

                animation:
                  "scanitySpin 0.8s linear infinite",

                margin:
                  "0 auto 14px",
              }}
            />

            <strong
              style={{
                fontFamily:
                  FONT,

                fontSize:
                  14,

                color:
                  PALETTE.textDark,
              }}
            >
              Logging out...
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}


// ── OCR Scanner Screen ───────────────────────────────────────────────────────

function OCRScannerScreen({
  go,
}: {
  go: (s: Screen) => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)

  const [scanStatus, setScanStatus] = useState<
    | "ready"
    | "scanning"
    | "captured"
    | "ocrProcessing"
    | "textPreview"
    | "productProcessing"
    | "error"
  >("ready")

  const [extractedText, setExtractedText] = useState("")
  const [ingredients, setIngredients] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState("")

  const [cameraFacing, setCameraFacing] = useState<
    "environment" | "user"
  >("environment")

  const [flashOn, setFlashOn] = useState(false)
  const [galleryImage, setGalleryImage] = useState<string | null>(null)

  const [productName, setProductName] = useState("")
  const [productFound, setProductFound] = useState(false)

  const videoRef =
    useRef<HTMLVideoElement | null>(null)

  const streamRef =
    useRef<MediaStream | null>(null)

  const processingRef =
    useRef(false)

  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#E8E5E0",

    sidebarBg: "#176B3A",
    sidebarDark: "#155B32",

    green: "#176B3A",
    greenLight: "#2E8B57",

    white: "#FFFFFF",

    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",

    border: "#E5E3DC",

    yellow: "#E0A72E",

    red: "#C94C4C",
    redSoft: "#FBECEC",

    greenSoft: "#E8F4EC",

    inputBg: "#F7F5F1",
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  // ──────────────────────────────────────────────────────────────────────────
  // STOP CAMERA
  // ──────────────────────────────────────────────────────────────────────────

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    setFlashOn(false)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // START CAMERA
  // ──────────────────────────────────────────────────────────────────────────

  const startCamera = async (
    requestedFacing?: "environment" | "user"
  ) => {
    try {
      setErrorMessage("")
      setGalleryImage(null)

      stopCamera()

      if (!window.isSecureContext) {
        throw new Error(
          "Camera requires HTTPS or localhost. Open Scanity using localhost or HTTPS."
        )
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser. Please use Google Chrome, Microsoft Edge, or Safari."
        )
      }

      setScanStatus("scanning")

      const facing =
        requestedFacing ?? cameraFacing

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: facing,
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        })

      streamRef.current = stream

      if (!videoRef.current) {
        throw new Error(
          "Camera preview could not be initialized."
        )
      }

      videoRef.current.srcObject = stream
      videoRef.current.muted = true
      videoRef.current.playsInline = true

      await videoRef.current.play()
    } catch (error) {
      console.error("Camera error:", error)

      let message =
        "Camera access was denied or the camera is unavailable."

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          message =
            "Camera permission was denied. Allow camera access in your browser settings and try again."
        } else if (
          error.name === "NotFoundError"
        ) {
          message =
            "No camera was found on this device."
        } else if (
          error.name === "NotReadableError"
        ) {
          message =
            "The camera is already being used by another application."
        }
      } else if (error instanceof Error) {
        message = error.message
      }

      setErrorMessage(message)
      setScanStatus("error")

      stopCamera()
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROTATE CAMERA
  // ──────────────────────────────────────────────────────────────────────────

  const rotateCamera = async () => {
    const nextFacing =
      cameraFacing === "environment"
        ? "user"
        : "environment"

    setCameraFacing(nextFacing)

    if (scanStatus === "scanning") {
      await startCamera(nextFacing)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FLASH
  // ──────────────────────────────────────────────────────────────────────────

  const toggleFlash = async () => {
    const stream = streamRef.current

    if (!stream) {
      setErrorMessage(
        "Start the camera first before using the flash."
      )
      return
    }

    const track =
      stream.getVideoTracks()[0]

    if (!track) {
      return
    }

    try {
      const capabilities =
        typeof track.getCapabilities ===
        "function"
          ? track.getCapabilities()
          : null

      if (!(capabilities as any)?.torch) {
        setErrorMessage(
          "Flash is not supported by this camera."
        )
        return
      }

      const nextFlash = !flashOn

      await track.applyConstraints({
        advanced: [
          {
            torch: nextFlash,
          } as any,
        ],
      })

      setFlashOn(nextFlash)
      setErrorMessage("")
    } catch (error) {
      console.error(
        "Flash error:",
        error
      )

      setErrorMessage(
        "The flash could not be controlled on this device."
      )
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAPTURE CAMERA IMAGE
  // ──────────────────────────────────────────────────────────────────────────

  const captureCameraFrame = async () => {
    const video = videoRef.current

    if (!video) {
      throw new Error(
        "Camera preview could not be initialized."
      )
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      throw new Error(
        "The camera is not ready yet. Please try again."
      )
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      throw new Error(
        "Unable to capture the camera image."
      )
    }

    const canvas =
      document.createElement("canvas")

    canvas.width = width
    canvas.height = height

    const context =
      canvas.getContext("2d")

    if (!context) {
      throw new Error(
        "Unable to process the camera image."
      )
    }

    if (cameraFacing === "user") {
      context.translate(width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    )

    return canvas
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PARSE INGREDIENTS
  // ──────────────────────────────────────────────────────────────────────────

  const parseIngredients = (
    text: string
  ) => {
    const lower = text.toLowerCase()

    const ingredientIndex =
      lower.indexOf("ingredients")

    if (ingredientIndex === -1) {
      return []
    }

    let ingredientText =
      text.substring(
        ingredientIndex
      )

    ingredientText =
      ingredientText.replace(
        /^ingredients?\s*:?\s*/i,
        ""
      )

    const stopWords = [
      "nutrition facts",
      "nutrition information",
      "allergen",
      "contains",
      "serving size",
      "calories",
    ]

    for (const stopWord of stopWords) {
      const index =
        ingredientText
          .toLowerCase()
          .indexOf(stopWord)

      if (index > 0) {
        ingredientText =
          ingredientText.substring(
            0,
            index
          )
      }
    }

    return ingredientText
      .split(/[,;\n]/)
      .map((item) =>
        item
          .replace(/[•*]/g, "")
          .trim()
      )
      .filter(
        (item) =>
          item.length > 1 &&
          item.length < 100
      )
      .slice(0, 30)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OCR PROCESS
  // ──────────────────────────────────────────────────────────────────────────

  const processOCR = async (
    source:
      | string
      | HTMLCanvasElement
      | File
  ) => {
    if (processingRef.current) {
      return
    }

    processingRef.current = true

    try {
      setErrorMessage("")
      stopCamera()

      setScanStatus("captured")

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      )

      setScanStatus("ocrProcessing")

      const worker =
        await createWorker("eng")

      const result =
        await worker.recognize(source)

      const text =
        result?.data?.text?.trim() || ""

      await worker.terminate()

      if (!text) {
        throw new Error(
          "No text was detected. Please make sure the nutrition label is clear and readable."
        )
      }

      const parsedIngredients =
        parseIngredients(text)

      setExtractedText(text)
      setIngredients(
        parsedIngredients
      )

      try {
        localStorage.setItem(
          "scanityOCRResult",
          JSON.stringify({
            text,
            ingredients:
              parsedIngredients,
            source: "ocr",
            scannedAt:
              new Date().toISOString(),
          })
        )
      } catch (error) {
        console.warn(
          "Unable to save OCR result:",
          error
        )
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      )

      setScanStatus("textPreview")
    } catch (error) {
      console.error(
        "OCR processing error:",
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while reading the nutrition label."
      )

      setScanStatus("error")
      stopCamera()
    } finally {
      processingRef.current = false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAPTURE
  // ──────────────────────────────────────────────────────────────────────────

  const handleCapture = async () => {
    if (processingRef.current) {
      return
    }

    if (!streamRef.current) {
      setErrorMessage(
        "Start the camera first before scanning."
      )
      return
    }

    try {
      setErrorMessage("")

      const canvas =
        await captureCameraFrame()

      await processOCR(canvas)
    } catch (error) {
      console.error(
        "OCR capture error:",
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to capture the nutrition label."
      )

      setScanStatus("error")
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GALLERY
  // ──────────────────────────────────────────────────────────────────────────

  const handleGallery = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image."
      )

      event.target.value = ""
      return
    }

    if (processingRef.current) {
      return
    }

    try {
      setErrorMessage("")

      stopCamera()

      const imageUrl =
        URL.createObjectURL(file)

      setGalleryImage(imageUrl)

      await processOCR(file)
    } catch (error) {
      console.error(
        "Gallery OCR error:",
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to read the selected image."
      )

      setScanStatus("error")
    }

    event.target.value = ""
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADD INGREDIENT
  // ──────────────────────────────────────────────────────────────────────────

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      "",
    ])
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE INGREDIENT
  // ──────────────────────────────────────────────────────────────────────────

  const updateIngredient = (
    index: number,
    value: string
  ) => {
    const updated = [
      ...ingredients,
    ]

    updated[index] = value

    setIngredients(updated)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REMOVE INGREDIENT
  // ──────────────────────────────────────────────────────────────────────────

  const removeIngredient = (
    index: number
  ) => {
    setIngredients(
      ingredients.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCT LOOKUP
  //
  // This is the local/demo Product + AI Service.
  // Replace this later with your real backend API.
  // ──────────────────────────────────────────────────────────────────────────

  const lookupProductFromOCR =
    async () => {
      if (processingRef.current) {
        return
      }

      processingRef.current = true

      try {
        setErrorMessage("")
        setScanStatus(
          "productProcessing"
        )

        const combinedText =
          `${extractedText} ${ingredients.join(
            " "
          )}`.toLowerCase()

        await new Promise((resolve) =>
          setTimeout(resolve, 1600)
        )

        // ─────────────────────────────────────
        // DEMO PRODUCT DATABASE
        // ─────────────────────────────────────

        let product = {
          name: "Sample Nutrition Product",
          brand: "Scanity Demo",
          category: "Food Product",
          score: 85,
          status: "Safe",
          calories: "120 kcal",
          sugar: "8 g",
          sodium: "90 mg",
          protein: "4 g",
          ingredients:
            ingredients.length > 0
              ? ingredients
              : [
                  "Water",
                  "Sugar",
                  "Milk",
                ],
        }

        // MILK
        if (
          combinedText.includes("milk") ||
          combinedText.includes("fresh milk")
        ) {
          product = {
            name: "Fresh Milk",
            brand: "Sample Brand",
            category: "Dairy",
            score: 87,
            status: "Safe",
            calories: "120 kcal",
            sugar: "8 g",
            sodium: "90 mg",
            protein: "4 g",
            ingredients:
              ingredients.length > 0
                ? ingredients
                : [
                    "Milk",
                    "Water",
                    "Vitamin A",
                    "Vitamin D",
                  ],
          }
        }

        // JUICE
        else if (
          combinedText.includes("juice") ||
          combinedText.includes("orange")
        ) {
          product = {
            name: "Orange Juice",
            brand: "Sample Brand",
            category: "Beverage",
            score: 72,
            status: "Fair",
            calories: "110 kcal",
            sugar: "22 g",
            sodium: "10 mg",
            protein: "1 g",
            ingredients:
              ingredients.length > 0
                ? ingredients
                : [
                    "Orange Juice",
                    "Water",
                    "Sugar",
                    "Citric Acid",
                  ],
          }
        }

        // CHOCOLATE
        else if (
          combinedText.includes(
            "chocolate"
          ) ||
          combinedText.includes(
            "cocoa"
          )
        ) {
          product = {
            name: "Chocolate Snack",
            brand: "Sample Brand",
            category: "Snack",
            score: 62,
            status: "Caution",
            calories: "210 kcal",
            sugar: "18 g",
            sodium: "80 mg",
            protein: "3 g",
            ingredients:
              ingredients.length > 0
                ? ingredients
                : [
                    "Sugar",
                    "Cocoa",
                    "Milk",
                    "Wheat",
                  ],
          }
        }

        // ─────────────────────────────────────
        // SAVE PRODUCT RESULT
        // ─────────────────────────────────────

        const productResult = {
          ...product,

          source: "ocr",

          extractedText,

          ingredients:
            product.ingredients,

          scannedAt:
            new Date().toISOString(),

          allergyStatus:
            "Checking allergies...",

          healthAnalysis:
            product.score >= 80
              ? "This product has a generally good nutrition profile."
              : product.score >= 60
                ? "This product is acceptable but should be consumed in moderation."
                : "This product should be consumed carefully.",
        }

        localStorage.setItem(
          "scanityProductResult",
          JSON.stringify(
            productResult
          )
        )

        localStorage.setItem(
          "scanityLastScan",
          JSON.stringify(
            productResult
          )
        )

        setProductName(
          product.name
        )

        setProductFound(true)

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        )

        go("productResult")
      } catch (error) {
        console.error(
          "Product lookup error:",
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to analyze this product."
        )

        setScanStatus("error")
      } finally {
        processingRef.current = false
      }
    }

  // ──────────────────────────────────────────────────────────────────────────
  // RETRY
  // ──────────────────────────────────────────────────────────────────────────

  const handleRetry = () => {
    stopCamera()

    setErrorMessage("")
    setExtractedText("")
    setIngredients([])
    setGalleryImage(null)
    setProductName("")
    setProductFound(false)

    setScanStatus("ready")
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BACK TO TEXT
  // ──────────────────────────────────────────────────────────────────────────

  const handleBackToText = () => {
    setErrorMessage("")
    setScanStatus("textPreview")
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    stopCamera()

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS TITLE
  // ──────────────────────────────────────────────────────────────────────────

  const getStatusTitle = () => {
    switch (scanStatus) {
      case "scanning":
        return "Ready to capture"

      case "captured":
        return "Image captured"

      case "ocrProcessing":
        return "Reading Nutrition Label..."

      case "textPreview":
        return "Review Extracted Information"

      case "productProcessing":
        return "Analyzing Product..."

      case "error":
        return "Unable to scan"

      default:
        return "Ready to scan"
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS DESCRIPTION
  // ──────────────────────────────────────────────────────────────────────────

  const getStatusDescription = () => {
    switch (scanStatus) {
      case "scanning":
        return "Position the nutrition label clearly inside the frame, then tap Capture."

      case "captured":
        return "Your nutrition label image has been captured."

      case "ocrProcessing":
        return "Scanity is reading the text from your nutrition label."

      case "textPreview":
        return "Review the extracted ingredients before continuing with product analysis."

      case "productProcessing":
        return "Scanity is analyzing the product, nutrition information, and allergies."

      case "error":
        return (
          errorMessage ||
          "Please try scanning again."
        )

      default:
        return "Scan a nutrition label to extract ingredients and nutritional information."
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarMenu = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
            }}
          >
            Scan
          </span>

          <span
            style={{
              color: "#9CE6B8",
            }}
          >
            ity
          </span>
        </span>
      </div>

      <p
        style={{
          margin: 0,
          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",
          color:
            "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: isDesktop
            ? "0 10px"
            : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              stopCamera()
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isDesktop
                ? "12px 14px"
                : "11px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize:
                  isDesktop ? 13 : 12,
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() =>
            setShowLogoutConfirm(true)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isDesktop
              ? "12px 14px"
              : "11px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              textAlign: "center",
              color: "#FFFFFF",
              transform: "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize:
                isDesktop ? 13 : 12,
              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: PALETTE.pageBg,
        fontFamily: FONT,
      }}
    >
      <style>
        {`
          @keyframes scanityScanLine {
            0% {
              top: 10%;
              opacity: 0.4;
            }

            50% {
              top: 85%;
              opacity: 1;
            }

            100% {
              top: 10%;
              opacity: 0.4;
            }
          }

          @keyframes scanitySpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @keyframes scanityPulse {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }

            50% {
              transform: scale(1.08);
              opacity: 1;
            }

            100% {
              transform: scale(1);
              opacity: 0.7;
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background:
              rgba(255,255,255,0.10) !important;
            transform:
              translateX(3px);
          }

          .scanity-scanner-button {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-scanner-button:hover {
            transform:
              translateY(-2px);
          }

          .scanity-scanner-button:active {
            transform:
              scale(0.97);
          }

          .scanity-input {
            outline: none;
            transition:
              border 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-input:focus {
            border-color: #176B3A !important;
            box-shadow:
              0 0 0 3px rgba(23,107,58,0.10);
          }
        `}
      </style>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════════════════ */}

      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            onClick={() =>
              setSidebarOpen(false)
            }
            style={{
              position: "absolute",
              inset: 0,
              background: isDesktop
                ? "transparent"
                : "rgba(0,0,0,0.40)",
              backdropFilter: isDesktop
                ? "none"
                : "blur(4px)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 205 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop
                ? "16px 0 16px 8px"
                : "10px",
              background: `linear-gradient(
                160deg,
                ${PALETTE.sidebarDark} 0%,
                ${PALETTE.sidebarBg} 48%,
                ${PALETTE.greenLight} 100%
              )`,
              borderRadius:
                "0 24px 24px 0",
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingBottom: 24,
              boxSizing: "border-box",
              overflow: "hidden",
              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: "50%",
                top: -85,
                right: -75,
                background:
                  "rgba(255,255,255,0.055)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 115,
                height: 115,
                borderRadius: "50%",
                bottom: 15,
                left: -70,
                background:
                  "rgba(255,255,255,0.035)",
                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}

      <header
        style={{
          marginLeft:
            sidebarOpen && isDesktop
              ? 205
              : 0,

          height: isDesktop ? 88 : 68,

          flexShrink: 0,

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          padding: isDesktop
            ? "0 28px"
            : "0 18px",

          boxSizing: "border-box",

          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
          }}
        >
          <button
            type="button"
            className="scanity-scanner-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              border:
                `1px solid ${PALETTE.border}`,
              background:
                PALETTE.white,
              padding: 0,
              color:
                PALETTE.green,
              cursor: "pointer",
              display:
                sidebarOpen && isDesktop
                  ? "none"
                  : "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 20,
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 2.5,
                  borderRadius: 5,
                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  width: 20,
                  height: 2.5,
                  borderRadius: 5,
                  background:
                    PALETTE.textDark,
                }}
              />

              <span
                style={{
                  width: 20,
                  height: 2.5,
                  borderRadius: 5,
                  background:
                    PALETTE.textDark,
                }}
              />
            </div>
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize:
                  isDesktop ? 23 : 19,
                color:
                  PALETTE.textDark,
              }}
            >
              Nutrition Label Scanner
            </h1>

            <p
              style={{
                margin: "4px 0 0",
                fontFamily: FONT,
                fontSize:
                  isDesktop ? 11 : 9,
                color:
                  PALETTE.textMuted,
              }}
            >
              Scan a nutrition label
            </p>
          </div>
        </div>

        <button
          type="button"
          className="scanity-scanner-button"
          onClick={() =>
            setShowHelp(true)
          }
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border:
              `1px solid ${PALETTE.border}`,
            background:
              PALETTE.white,
            color:
              PALETTE.green,
            cursor: "pointer",
          }}
        >
          <i className="fa fa-question" />
        </button>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════════════════════════════ */}

      <main
        style={{
          marginLeft:
            sidebarOpen && isDesktop
              ? 205
              : 0,

          flex: 1,

          overflowY: "auto",

          padding: isDesktop
            ? "8px 28px 32px"
            : "20px 16px 30px",

          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth:
              isDesktop ? 1100 : 760,
            margin: "0 auto",
          }}
        >

          {/* ════════════════════════════════════════════════════════════════
              TEXT PREVIEW / EDITOR
          ════════════════════════════════════════════════════════════════ */}

          {scanStatus === "textPreview" ? (
            <section
              style={{
                background:
                  PALETTE.white,
                border:
                  `1px solid ${PALETTE.border}`,
                borderRadius: 24,
                padding:
                  isDesktop ? 28 : 20,
                boxShadow:
                  "0 8px 28px rgba(50,40,30,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 15,
                    background:
                      PALETTE.greenSoft,
                    color:
                      PALETTE.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="fa fa-check"
                    style={{
                      fontSize: 20,
                    }}
                  />
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: FONT,
                      fontSize: 18,
                      fontWeight: 800,
                      color:
                        PALETTE.textDark,
                    }}
                  >
                    Text Extracted Successfully
                  </h2>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      fontFamily: FONT,
                      fontSize: 10,
                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    Review the information before product analysis.
                  </p>
                </div>
              </div>

              {/* EXTRACTED TEXT */}

              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      PALETTE.textDark,
                  }}
                >
                  Extracted Text
                </label>

                <textarea
                  className="scanity-input"
                  value={extractedText}
                  onChange={(event) =>
                    setExtractedText(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    minHeight: 150,
                    resize: "vertical",
                    boxSizing: "border-box",
                    padding: 14,
                    border:
                      `1px solid ${PALETTE.border}`,
                    borderRadius: 14,
                    background:
                      PALETTE.inputBg,
                    fontFamily: FONT,
                    fontSize: 11,
                    lineHeight: 1.6,
                    color:
                      PALETTE.textDark,
                  }}
                />
              </div>

              {/* INGREDIENTS */}

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: FONT,
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          PALETTE.textDark,
                      }}
                    >
                      Ingredients
                    </label>

                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 9,
                        color:
                          PALETTE.textMuted,
                      }}
                    >
                      You can edit the extracted ingredients.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addIngredient
                    }
                    style={{
                      border: "none",
                      borderRadius: 10,
                      background:
                        PALETTE.greenSoft,
                      color:
                        PALETTE.green,
                      padding:
                        "8px 11px",
                      fontFamily: FONT,
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <i
                      className="fa fa-plus"
                      style={{
                        marginRight: 5,
                      }}
                    />
                    Add
                  </button>
                </div>

                {ingredients.length ===
                0 ? (
                  <div
                    style={{
                      padding: 18,
                      border:
                        `1px dashed ${PALETTE.border}`,
                      borderRadius: 13,
                      textAlign: "center",
                      fontFamily: FONT,
                      fontSize: 10,
                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    No ingredients were automatically detected.
                    You can add them manually.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 8,
                    }}
                  >
                    {ingredients.map(
                      (
                        ingredient,
                        index
                      ) => (
                        <div
                          key={`${index}-${ingredient}`}
                          style={{
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <input
                            className="scanity-input"
                            value={
                              ingredient
                            }
                            onChange={(
                              event
                            ) =>
                              updateIngredient(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={`Ingredient ${
                              index + 1
                            }`}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding:
                                "10px 12px",
                              border:
                                `1px solid ${PALETTE.border}`,
                              borderRadius: 11,
                              background:
                                PALETTE.inputBg,
                              fontFamily:
                                FONT,
                              fontSize: 10,
                              color:
                                PALETTE.textDark,
                            }}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeIngredient(
                                index
                              )
                            }
                            style={{
                              width: 38,
                              border: "none",
                              borderRadius: 11,
                              background:
                                PALETTE.redSoft,
                              color:
                                PALETTE.red,
                              cursor:
                                "pointer",
                            }}
                          >
                            <i className="fa fa-trash" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 25,
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleRetry
                  }
                  style={{
                    flex: 1,
                    padding: 13,
                    border:
                      `1px solid ${PALETTE.border}`,
                    borderRadius: 13,
                    background:
                      PALETTE.white,
                    color:
                      PALETTE.textDark,
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Scan Again
                </button>

                <button
                  type="button"
                  onClick={
                    lookupProductFromOCR
                  }
                  style={{
                    flex: 2,
                    padding: 13,
                    border: "none",
                    borderRadius: 13,
                    background:
                      PALETTE.green,
                    color:
                      PALETTE.white,
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <i
                    className="fa fa-search"
                    style={{
                      marginRight: 7,
                    }}
                  />

                  Analyze Product
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* ════════════════════════════════════════════════════════════
                  SCANNER CARD
              ════════════════════════════════════════════════════════════ */}

              <section
                style={{
                  background:
                    PALETTE.white,
                  border:
                    `1px solid ${PALETTE.border}`,
                  borderRadius: 24,
                  padding:
                    isDesktop ? 12 : 16,
                  boxShadow:
                    "0 8px 28px rgba(50,40,30,0.08)",
                }}
              >
                {/* CAMERA AREA */}

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth:
                      isDesktop
                        ? 900
                        : 640,
                    height:
                      isDesktop
                        ? 520
                        : 285,
                    margin: "0 auto",
                    background:
                      "#111111",
                    borderRadius:
                      isDesktop
                        ? 8
                        : 20,
                    overflow: "hidden",
                  }}
                >
                  {/* VIDEO */}

                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform:
                        cameraFacing ===
                        "user"
                          ? "scaleX(-1)"
                          : "none",
                      display:
                        scanStatus ===
                          "captured" ||
                        scanStatus ===
                          "ocrProcessing" ||
                        scanStatus ===
                          "productProcessing"
                          ? "none"
                          : "block",
                    }}
                  />

                  {/* GALLERY */}

                  {galleryImage &&
                    scanStatus !==
                      "ready" && (
                      <img
                        src={galleryImage}
                        alt="Selected nutrition label"
                        style={{
                          position:
                            "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "contain",
                          background:
                            "#111111",
                        }}
                      />
                    )}

                  {/* READY */}

                  {scanStatus ===
                    "ready" &&
                    !galleryImage && (
                      <div
                        style={{
                          position:
                            "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          textAlign:
                            "center",
                          padding: 20,
                          color:
                            "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            width: 66,
                            height: 66,
                            borderRadius:
                              "50%",
                            background:
                              "rgba(255,255,255,0.12)",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            marginBottom:
                              14,
                          }}
                        >
                          <i
                            className="fa fa-camera"
                            style={{
                              fontSize: 27,
                            }}
                          />
                        </div>

                        <strong
                          style={{
                            fontSize: 16,
                          }}
                        >
                          Camera ready
                        </strong>

                        <span
                          style={{
                            marginTop: 7,
                            fontSize: 10,
                            color:
                              "rgba(255,255,255,0.7)",
                          }}
                        >
                          Tap Camera to begin
                        </span>
                      </div>
                    )}

                  {/* SCANNING */}

                  {scanStatus ===
                    "scanning" && (
                    <>
                      <div
                        style={{
                          position:
                            "absolute",
                          left: "50%",
                          top: "50%",
                          width:
                            isDesktop
                              ? "68%"
                              : "76%",
                          height:
                            isDesktop
                              ? "55%"
                              : "52%",
                          transform:
                            "translate(-50%, -50%)",
                          border:
                            "2px solid rgba(255,255,255,0.9)",
                          borderRadius: 18,
                          boxShadow:
                            "0 0 0 9999px rgba(0,0,0,0.32)",
                        }}
                      >
                        <span
                          style={{
                            position:
                              "absolute",
                            left: -2,
                            top: -2,
                            width: 32,
                            height: 32,
                            borderTop:
                              `4px solid ${PALETTE.yellow}`,
                            borderLeft:
                              `4px solid ${PALETTE.yellow}`,
                            borderRadius:
                              "10px 0 0 0",
                          }}
                        />

                        <span
                          style={{
                            position:
                              "absolute",
                            right: -2,
                            top: -2,
                            width: 32,
                            height: 32,
                            borderTop:
                              `4px solid ${PALETTE.yellow}`,
                            borderRight:
                              `4px solid ${PALETTE.yellow}`,
                            borderRadius:
                              "0 10px 0 0",
                          }}
                        />

                        <span
                          style={{
                            position:
                              "absolute",
                            left: -2,
                            bottom: -2,
                            width: 32,
                            height: 32,
                            borderBottom:
                              `4px solid ${PALETTE.yellow}`,
                            borderLeft:
                              `4px solid ${PALETTE.yellow}`,
                            borderRadius:
                              "0 0 0 10px",
                          }}
                        />

                        <span
                          style={{
                            position:
                              "absolute",
                            right: -2,
                            bottom: -2,
                            width: 32,
                            height: 32,
                            borderBottom:
                              `4px solid ${PALETTE.yellow}`,
                            borderRight:
                              `4px solid ${PALETTE.yellow}`,
                            borderRadius:
                              "0 0 10px 0",
                          }}
                        />

                        <span
                          style={{
                            position:
                              "absolute",
                            left: "4%",
                            right: "4%",
                            height: 2,
                            background:
                              PALETTE.yellow,
                            boxShadow:
                              "0 0 10px rgba(224,167,46,0.9)",
                            animation:
                              "scanityScanLine 2s ease-in-out infinite",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          position:
                            "absolute",
                          bottom: 18,
                          left: 0,
                          right: 0,
                          textAlign:
                            "center",
                          color:
                            "#FFFFFF",
                          fontSize: 10,
                          fontWeight: 600,
                          textShadow:
                            "0 1px 5px rgba(0,0,0,0.8)",
                        }}
                      >
                        Position the nutrition label inside the frame
                      </div>
                    </>
                  )}

                  {/* CAPTURED */}

                  {scanStatus ===
                    "captured" && (
                    <div
                      style={{
                        position:
                          "absolute",
                        inset: 0,
                        background:
                          "rgba(23,107,58,0.95)",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        color:
                          "#FFFFFF",
                        textAlign:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius:
                            "50%",
                          background:
                            "#FFFFFF",
                          color:
                            PALETTE.green,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          marginBottom:
                            14,
                        }}
                      >
                        <i
                          className="fa fa-check"
                          style={{
                            fontSize: 34,
                          }}
                        />
                      </div>

                      <strong
                        style={{
                          fontSize: 18,
                        }}
                      >
                        Image Captured
                      </strong>

                      <span
                        style={{
                          marginTop: 7,
                          fontSize: 12,
                        }}
                      >
                        Preparing OCR analysis...
                      </span>
                    </div>
                  )}

                  {/* OCR PROCESSING */}

                  {scanStatus ===
                    "ocrProcessing" && (
                    <div
                      style={{
                        position:
                          "absolute",
                        inset: 0,
                        background:
                          "rgba(255,255,255,0.97)",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        textAlign:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius:
                            "50%",
                          border:
                            `5px solid ${PALETTE.border}`,
                          borderTopColor:
                            PALETTE.green,
                          animation:
                            "scanitySpin 0.8s linear infinite",
                          marginBottom:
                            18,
                        }}
                      />

                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius:
                            "50%",
                          background:
                            PALETTE.greenSoft,
                          color:
                            PALETTE.green,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          marginBottom:
                            12,
                          animation:
                            "scanityPulse 1.4s ease-in-out infinite",
                        }}
                      >
                        <i
                          className="fa fa-file-text-o"
                          style={{
                            fontSize: 18,
                          }}
                        />
                      </div>

                      <strong
                        style={{
                          fontSize:
                            isDesktop
                              ? 20
                              : 17,
                          fontWeight: 800,
                          color:
                            PALETTE.textDark,
                        }}
                      >
                        Reading Nutrition Label...
                      </strong>

                      <span
                        style={{
                          maxWidth: 390,
                          marginTop: 8,
                          padding:
                            "0 20px",
                          fontSize: 10,
                          lineHeight: 1.6,
                          color:
                            PALETTE.textMuted,
                        }}
                      >
                        Scanity is extracting text and ingredients from the nutrition label.
                      </span>
                    </div>
                  )}

                  {/* PRODUCT PROCESSING */}

                  {scanStatus ===
                    "productProcessing" && (
                    <div
                      style={{
                        position:
                          "absolute",
                        inset: 0,
                        background:
                          "rgba(255,255,255,0.97)",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        textAlign:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius:
                            "50%",
                          border:
                            `5px solid ${PALETTE.border}`,
                          borderTopColor:
                            PALETTE.green,
                          animation:
                            "scanitySpin 0.8s linear infinite",
                          marginBottom:
                            18,
                        }}
                      />

                      <strong
                        style={{
                          fontSize:
                            isDesktop
                              ? 20
                              : 17,
                          fontWeight: 800,
                          color:
                            PALETTE.textDark,
                        }}
                      >
                        Analyzing Product...
                      </strong>

                      <span
                        style={{
                          maxWidth: 390,
                          marginTop: 8,
                          padding:
                            "0 20px",
                          fontSize: 10,
                          lineHeight: 1.6,
                          color:
                            PALETTE.textMuted,
                        }}
                      >
                        Checking product information, nutrition, health score, and allergies.
                      </span>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                          marginTop: 18,
                        }}
                      >
                        {[0, 1, 2].map(
                          (item) => (
                            <span
                              key={item}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius:
                                  "50%",
                                background:
                                  PALETTE.green,
                                animation:
                                  `scanityPulse 1s ease-in-out ${
                                    item *
                                    0.2
                                  }s infinite`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* ERROR */}

                  {scanStatus ===
                    "error" && (
                    <div
                      style={{
                        position:
                          "absolute",
                        inset: 0,
                        background:
                          "rgba(255,255,255,0.97)",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        textAlign:
                          "center",
                        padding: 25,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius:
                            "50%",
                          background:
                            PALETTE.redSoft,
                          color:
                            PALETTE.red,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          marginBottom:
                            13,
                        }}
                      >
                        <i
                          className="fa fa-exclamation"
                          style={{
                            fontSize: 24,
                          }}
                        />
                      </div>

                      <strong
                        style={{
                          fontSize: 16,
                          color:
                            PALETTE.textDark,
                        }}
                      >
                        Unable to scan
                      </strong>

                      <span
                        style={{
                          maxWidth: 440,
                          marginTop: 8,
                          fontSize: 10,
                          lineHeight: 1.6,
                          color:
                            PALETTE.textMuted,
                        }}
                      >
                        {errorMessage}
                      </span>

                      <button
                        type="button"
                        onClick={
                          handleRetry
                        }
                        style={{
                          marginTop: 17,
                          padding:
                            "10px 19px",
                          border: "none",
                          borderRadius: 12,
                          background:
                            PALETTE.green,
                          color:
                            PALETTE.white,
                          fontFamily:
                            FONT,
                          fontWeight: 700,
                          fontSize: 11,
                          cursor:
                            "pointer",
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* STATUS */}

                <div
                  style={{
                    textAlign:
                      "center",
                    marginTop: 19,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontFamily:
                        FONT,
                      fontWeight: 800,
                      fontSize:
                        isDesktop
                          ? 19
                          : 17,
                      color:
                        PALETTE.textDark,
                    }}
                  >
                    {getStatusTitle()}
                  </h2>

                  <p
                    style={{
                      maxWidth: 530,
                      margin:
                        "7px auto 0",
                      fontFamily:
                        FONT,
                      fontSize: 10,
                      lineHeight: 1.6,
                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    {getStatusDescription()}
                  </p>
                </div>

                {/* CONTROLS */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4, 1fr)",
                    gap: 9,
                    maxWidth: 560,
                    margin:
                      "20px auto 0",
                  }}
                >
                  {/* CAMERA */}

                  <button
                    type="button"
                    className="scanity-scanner-button"
                    onClick={() =>
                      startCamera()
                    }
                    disabled={
                      scanStatus ===
                        "captured" ||
                      scanStatus ===
                        "ocrProcessing" ||
                      scanStatus ===
                        "productProcessing"
                    }
                    style={{
                      border:
                        `1px solid ${PALETTE.border}`,
                      background:
                        PALETTE.white,
                      borderRadius: 14,
                      padding:
                        isDesktop
                          ? "13px 8px"
                          : "11px 5px",
                      color:
                        PALETTE.green,
                      cursor:
                        "pointer",
                      opacity:
                        scanStatus ===
                          "captured" ||
                        scanStatus ===
                          "ocrProcessing" ||
                        scanStatus ===
                          "productProcessing"
                          ? 0.5
                          : 1,
                    }}
                  >
                    <i
                      className="fa fa-camera"
                      style={{
                        fontSize: 17,
                      }}
                    />

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 600,
                        fontSize: 9,
                      }}
                    >
                      Camera
                    </div>
                  </button>

                  {/* ROTATE */}

                  <button
                    type="button"
                    className="scanity-scanner-button"
                    onClick={
                      rotateCamera
                    }
                    disabled={
                      scanStatus ===
                        "captured" ||
                      scanStatus ===
                        "ocrProcessing" ||
                      scanStatus ===
                        "productProcessing"
                    }
                    style={{
                      border:
                        `1px solid ${PALETTE.border}`,
                      background:
                        PALETTE.white,
                      borderRadius: 14,
                      padding:
                        isDesktop
                          ? "13px 8px"
                          : "11px 5px",
                      color:
                        PALETTE.green,
                      cursor:
                        "pointer",
                      opacity:
                        scanStatus ===
                          "captured" ||
                        scanStatus ===
                          "ocrProcessing" ||
                        scanStatus ===
                          "productProcessing"
                          ? 0.5
                          : 1,
                    }}
                  >
                    <i
                      className="fa fa-refresh"
                      style={{
                        fontSize: 17,
                      }}
                    />

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 600,
                        fontSize: 9,
                      }}
                    >
                      Rotate Camera
                    </div>
                  </button>

                  {/* GALLERY */}

                  <label
                    className="scanity-scanner-button"
                    style={{
                      border:
                        `1px solid ${PALETTE.border}`,
                      background:
                        PALETTE.white,
                      borderRadius: 14,
                      padding:
                        isDesktop
                          ? "13px 8px"
                          : "11px 5px",
                      color:
                        PALETTE.green,
                      cursor:
                        "pointer",
                      textAlign:
                        "center",
                    }}
                  >
                    <i
                      className="fa fa-picture-o"
                      style={{
                        fontSize: 17,
                      }}
                    />

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 600,
                        fontSize: 9,
                      }}
                    >
                      Gallery
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleGallery
                      }
                      disabled={
                        scanStatus ===
                          "captured" ||
                        scanStatus ===
                          "ocrProcessing" ||
                        scanStatus ===
                          "productProcessing"
                      }
                      style={{
                        display:
                          "none",
                      }}
                    />
                  </label>

                  {/* FLASH */}

                  <button
                    type="button"
                    className="scanity-scanner-button"
                    onClick={
                      toggleFlash
                    }
                    disabled={
                      scanStatus !==
                      "scanning"
                    }
                    style={{
                      border:
                        `1px solid ${
                          flashOn
                            ? PALETTE.yellow
                            : PALETTE.border
                        }`,
                      background:
                        flashOn
                          ? "#FFF6DD"
                          : PALETTE.white,
                      borderRadius: 14,
                      padding:
                        isDesktop
                          ? "13px 8px"
                          : "11px 5px",
                      color:
                        flashOn
                          ? "#C98A1F"
                          : PALETTE.green,
                      cursor:
                        "pointer",
                      opacity:
                        scanStatus !==
                        "scanning"
                          ? 0.5
                          : 1,
                    }}
                  >
                    <i
                      className="fa fa-bolt"
                      style={{
                        fontSize: 17,
                      }}
                    />

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 600,
                        fontSize: 9,
                      }}
                    >
                      Flash
                    </div>
                  </button>
                </div>

                {/* CAPTURE */}

                {scanStatus ===
                  "scanning" && (
                  <button
                    type="button"
                    className="scanity-scanner-button"
                    onClick={
                      handleCapture
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: 560,
                      margin:
                        "18px auto 0",
                      padding: 15,
                      border: "none",
                      borderRadius: 15,
                      background:
                        PALETTE.green,
                      color:
                        PALETTE.white,
                      fontFamily:
                        FONT,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor:
                        "pointer",
                      boxShadow:
                        "0 7px 20px rgba(23,107,58,0.22)",
                    }}
                  >
                    <i
                      className="fa fa-camera"
                      style={{
                        marginRight: 8,
                      }}
                    />

                    Capture Nutrition Label
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          HELP MODAL
      ══════════════════════════════════════════════════════════════════════ */}

      {showHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.45)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              background:
                PALETTE.white,
              borderRadius: 22,
              padding: 24,
            }}
          >
            <h3
              style={{
                margin:
                  "0 0 18px",
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              How to scan
            </h3>

            {[
              "Tap Camera.",
              "Allow camera permission.",
              "Place the nutrition label inside the frame.",
              "Tap Capture Nutrition Label.",
              "Review the extracted text and ingredients.",
              "Tap Analyze Product.",
              "Scanity will show the product result and allergy status.",
            ].map(
              (
                instruction,
                index
              ) => (
                <div
                  key={instruction}
                  style={{
                    display:
                      "flex",
                    gap: 11,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 25,
                      height: 25,
                      flexShrink: 0,
                      borderRadius:
                        "50%",
                      background:
                        PALETTE.greenSoft,
                      color:
                        PALETTE.green,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </div>

                  <span
                    style={{
                      fontFamily:
                        FONT,
                      fontSize: 10,
                      lineHeight: 1.6,
                      color:
                        PALETTE.textMuted,
                    }}
                  >
                    {instruction}
                  </span>
                </div>
              )
            )}

            <button
              type="button"
              onClick={() =>
                setShowHelp(false)
              }
              style={{
                width: "100%",
                marginTop: 8,
                padding: 13,
                border: "none",
                borderRadius: 13,
                background:
                  PALETTE.green,
                color:
                  PALETTE.white,
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOGOUT CONFIRMATION
      ══════════════════════════════════════════════════════════════════════ */}

      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.45)",
            zIndex: 210,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 390,
              background:
                PALETTE.white,
              borderRadius: 22,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius:
                  "50%",
                background:
                  PALETTE.redSoft,
                color:
                  PALETTE.red,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin:
                  "0 auto 14px",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 22,
                }}
              />
            </div>

            <h3
              style={{
                margin: 0,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 17,
              }}
            >
              Are you sure you want to logout?
            </h3>

            <p
              style={{
                margin:
                  "8px 0 20px",
                fontFamily: FONT,
                fontSize: 10,
                color:
                  PALETTE.textMuted,
              }}
            >
              You will be returned to the login screen.
            </p>

            <div
              style={{
                display: "flex",
                gap: 9,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(
                    false
                  )
                }
                style={{
                  flex: 1,
                  padding: 13,
                  border:
                    `1px solid ${PALETTE.border}`,
                  borderRadius: 13,
                  background:
                    PALETTE.white,
                  fontFamily: FONT,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                style={{
                  flex: 1,
                  padding: 13,
                  border: "none",
                  borderRadius: 13,
                  background:
                    PALETTE.red,
                  color:
                    PALETTE.white,
                  fontFamily: FONT,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOGOUT LOADING
      ══════════════════════════════════════════════════════════════════════ */}

      {showLogoutLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            zIndex: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 260,
              background:
                PALETTE.white,
              borderRadius: 20,
              padding: 25,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius:
                  "50%",
                border:
                  `4px solid ${PALETTE.border}`,
                borderTopColor:
                  PALETTE.green,
                animation:
                  "scanitySpin 0.8s linear infinite",
                margin:
                  "0 auto 14px",
              }}
            />

            <strong
              style={{
                fontFamily: FONT,
                fontSize: 14,
                color:
                  PALETTE.textDark,
              }}
            >
              Logging out...
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}
// ── Product Result Screen ─────────────────────────────────────────────────────
function ProductResultScreen({ go }: { go: (s: Screen) => void }) {
  const isDesktop = useIsDesktop()
  const score = 68
  const scoreColor =
    score >= 71 ? "#4CAF50" : score >= 42 ? "#F5C518" : "#E8453C"
  const flags = [
    { warn: true, text: "Contains Sodium benzoate" },
    { warn: true, text: "Contains Maltodextrin" },
    { warn: false, text: "No Allergy Detected" },
  ]
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "#071A0F",
        overflow: "hidden",
      }}
    >
      {/* ── Header —  */}
      <div style={{ paddingTop: 12 }}>
  <InfoHeader
    title="Product Result"
    subtitle="Scan analysis complete"
    go={go}
  />
</div>

      <div style={{ flex: 1, overflowY: "auto", marginTop: 15 }}>
        <Center
          maxWidth={isDesktop ? 900 : 640}
          style={{ padding: isDesktop ? "30px 40px 40px" : "30 16px 24px" }}
        >
        {/* Product image */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 16,
            background: "rgba(20,55,35,0.8)",
            border: "1.5px dashed rgba(224,167,46,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(224,167,46,0.4)"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        {/* Name + score */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: C.textOnDark,
              }}
            >
              Noodles - Beef
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                marginTop: 2,
              }}
            >
              Brand · 85g pack
            </p>
          </div>
          {/* Score circle */}
          <div
            style={{
              position: "relative",
              width: 56,
              height: 56,
              flexShrink: 0,
            }}
          >
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="5"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke={scoreColor}
                strokeWidth="5"
                strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <p
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                color: scoreColor,
              }}
            >
              {score}
            </p>
          </div>
        </div>
        {/* Score bar */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background:
                "linear-gradient(to right, #E8453C 0%, #E8453C 40%, #F5C518 40%, #F5C518 70%, #E0A72E 70%, #E0A72E 100%)",
              marginBottom: 4,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["0-40 Bad", "42-70 Concerns", "71-100 Good"].map((l, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {l}
              </p>
            ))}
          </div>
        </div>
        {/* Flags */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {flags.map((f, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {f.warn ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F5C518"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.greenLight}
                  strokeWidth="2.2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 13,
                  color: f.warn ? C.textOnDark : "rgba(255,255,255,0.5)",
                }}
              >
                {f.text}
              </p>
            </div>
          ))}
        </div>
        {/* Why flagged */}
        <div
          style={{
            borderRadius: 14,
            background: "rgba(20,55,35,0.8)",
            border: "1.5px solid rgba(224,167,46,0.2)",
            padding: "14px 16px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#F5C518"
              stroke="#F5C518"
              strokeWidth="1"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p
              style={{
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: C.textOnDark,
              }}
            >
              Why is it flagged
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.5,
            }}
          >
            High sodium may affect your hypertension
          </p>
        </div>
        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 14,
              border: "1.5px solid rgba(224,167,46,0.4)",
              background: "transparent",
              color: C.greenLight,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={() => go("productCompare")}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #E0A72E, #C98A1F)",
              color: "#071A0F",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            COMPARE
          </button>
        </div>
        </Center>
      </div>
    </div>
  )
}

// ── Product Compare Screen ────────────────────────────────────────────────────
// Drop-in replacement for the existing COMPARE_PRODUCTS constant and
// ProductCompareScreen function in App.tsx. Uses the same C palette, Center,
// BackBtn, useIsDesktop, SAFE_TOP, logoImg, and Screen type already defined
// in App.tsx — no new imports needed, no glassmorphism, gold reserved for
// CTAs/highlights while green/amber/red stay reserved for Safe/Caution/Avoid.
//
// Field shapes match what OpenFoodFacts-backed lookups already return
// elsewhere (ProductResultScreen); verdict/breakdown/recommendation are the
// three fields the Rule Engine still needs to add to /api/compare — see the
// note rendered at the bottom of the success view instead of guessing values.

type CompareVerdict = "safe" | "caution" | "avoid" | null

type CompareProduct = {
  name: string
  brand?: string
  quantity?: string
  score: number | null
  verdict: CompareVerdict
  verdictReason?: string
  // undefined = not returned by backend, [] = confirmed no allergens found
  allergens?: string[]
  ingredientsText?: string
  nutrition?: {
    energyKcal100g?: number
    sugars100g?: number
    fat100g?: number
    saturatedFat100g?: number
    carbohydrates100g?: number
    proteins100g?: number
    sodium100g?: number
    fiber100g?: number
  }
  breakdown?: { ingredient: number; nutrition: number; processing: number } | null
}

const COMPARE_PRODUCT_A: CompareProduct = {
  name: "Noodles - Beef",
  brand: "Golden Wok",
  quantity: "85g pack",
  score: 68,
  verdict: "caution",
  verdictReason: "High sodium may not suit a hypertension profile.",
  allergens: ["wheat", "soy"],
  ingredientsText:
    "Wheat flour, palm oil, salt, beef flavoring (contains soy), sodium benzoate, maltodextrin, monosodium glutamate, dried vegetables (cabbage, carrot, scallion), spices, sugar, caramel color, disodium inosinate, disodium guanylate.",
  nutrition: { energyKcal100g: 436, sugars100g: 4, fat100g: 17, saturatedFat100g: 8, carbohydrates100g: 61, proteins100g: 9, sodium100g: 0.84, fiber100g: 2 },
  breakdown: { ingredient: 54, nutrition: 48, processing: 40 },
}

const COMPARE_PRODUCT_B: CompareProduct = {
  name: "Noodles - Chicken",
  brand: "Golden Wok",
  quantity: "85g pack",
  score: 72,
  verdict: "safe",
  verdictReason: "No allergens or ingredients flagged against your saved profile.",
  allergens: [],
  ingredientsText:
    "Wheat flour, palm oil, salt, chicken flavoring, dried vegetables (carrot, scallion, corn), spices, sugar, turmeric, disodium inosinate, disodium guanylate.",
  nutrition: { energyKcal100g: 410, sugars100g: 1, fat100g: 14, saturatedFat100g: 6, carbohydrates100g: 58, proteins100g: 10, sodium100g: 0.41, fiber100g: 3 },
  breakdown: { ingredient: 66, nutrition: 61, processing: 55 },
}

function scoreColor(score: number | null): string {
  if (score === null) return "rgba(255,255,255,0.35)"
  return score >= 71 ? C.statusSafe : score >= 42 ? C.statusCaution : C.statusDanger
}

function ScoreRing({ score, size = 56 }: { score: number | null; size?: number }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const pct = score === null ? 0 : score / 100
  const color = scoreColor(score)
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${pct * circ} ${circ}`}
          />
        )}
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 800,
          fontSize: score === null ? 9 : 15,
          color,
        }}
      >
        {score === null ? "N/A" : score}
      </span>
    </div>
  )
}

function VerdictChip({ verdict, reason }: { verdict: CompareVerdict; reason?: string }) {
  if (!verdict) {
    return (
      <span
        title="Not enough data to determine a verdict"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 700,
          fontStyle: "italic",
          background: "rgba(255,255,255,0.06)",
          border: "1px dashed rgba(255,255,255,0.28)",
          color: "rgba(255,255,255,0.42)",
        }}
      >
        Verdict unavailable
      </span>
    )
  }
  const meta = {
    safe: { label: "Safe", color: C.statusSafe, bg: "rgba(76,175,80,0.16)", border: "rgba(76,175,80,0.5)" },
    caution: { label: "Caution", color: C.statusCaution, bg: "rgba(245,197,24,0.14)", border: "rgba(245,197,24,0.5)" },
    avoid: { label: "Avoid", color: C.statusDanger, bg: "rgba(232,69,60,0.14)", border: "rgba(232,69,60,0.5)" },
  }[verdict]
  return (
    <span
      title={reason}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
      }}
    >
      {verdict === "safe" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {verdict === "caution" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
      {verdict === "avoid" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      {meta.label}
    </span>
  )
}

function ScoreBreakdown({ breakdown }: { breakdown?: CompareProduct["breakdown"] }) {
  if (!breakdown) {
    return <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: 0 }}>Score breakdown unavailable for this product</p>
  }
  const rows = [
    { label: "Ingredient Quality", val: breakdown.ingredient },
    { label: "Nutritional Profile", val: breakdown.nutrition },
    { label: "Processing Methods", val: breakdown.processing },
  ]
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: "rgba(255,255,255,0.62)", fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: C.textOnDark }}>{r.val}/100</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.09)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${r.val}%`, borderRadius: 4, background: `linear-gradient(90deg, ${C.goldDark}, ${C.greenLight})` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AllergenList({ allergens }: { allergens?: string[] }) {
  if (allergens === undefined) {
    return (
      <span
        style={{
          padding: "5px 10px",
          borderRadius: 10,
          fontSize: 10.5,
          fontWeight: 600,
          fontStyle: "italic",
          background: "transparent",
          border: "1px dashed rgba(255,255,255,0.28)",
          color: "rgba(255,255,255,0.42)",
        }}
      >
        Allergen data unavailable
      </span>
    )
  }
  if (allergens.length === 0) {
    return (
      <span
        style={{
          padding: "5px 10px",
          borderRadius: 10,
          fontSize: 10.5,
          fontWeight: 600,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        No identified allergens
      </span>
    )
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {allergens.map((a) => (
        <span
          key={a}
          style={{
            padding: "5px 10px",
            borderRadius: 10,
            fontSize: 10.5,
            fontWeight: 600,
            background: "rgba(232,69,60,0.12)",
            border: "1px solid rgba(232,69,60,0.4)",
            color: "#F0857C",
          }}
        >
          Contains {a.charAt(0).toUpperCase() + a.slice(1)}
        </span>
      ))}
    </div>
  )
}

function IngredientsBlock({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) {
    return <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: 0 }}>Ingredient information not provided for this product</p>
  }
  const isLong = text.length > 180
  return (
    <div>
      <p
        style={{
          fontSize: 11.5,
          lineHeight: 1.65,
          color: "rgba(255,255,255,0.65)",
          margin: 0,
          maxHeight: expanded || !isLong ? "none" : 84,
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ marginTop: 6, background: "none", border: "none", color: C.greenLight, fontSize: 10.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}

const NUTRITION_ROWS: { key: keyof NonNullable<CompareProduct["nutrition"]>; label: string; unit: string }[] = [
  { key: "energyKcal100g", label: "Energy", unit: "kcal" },
  { key: "sugars100g", label: "Sugars", unit: "g" },
  { key: "fat100g", label: "Fat", unit: "g" },
  { key: "saturatedFat100g", label: "Saturated fat", unit: "g" },
  { key: "carbohydrates100g", label: "Carbohydrates", unit: "g" },
  { key: "proteins100g", label: "Protein", unit: "g" },
  { key: "sodium100g", label: "Sodium", unit: "g" },
  { key: "fiber100g", label: "Fiber", unit: "g" },
]

function NutritionTable({ a, b }: { a: CompareProduct; b: CompareProduct }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(20,55,35,0.85)", border: "1.5px solid rgba(224,167,46,0.28)", padding: 20, marginTop: 20 }}>
      <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>
        Nutrition Comparison — per 100g
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th />
              <th style={{ textAlign: "right", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.42)", paddingBottom: 8 }}>{a.name}</th>
              <th style={{ textAlign: "right", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.42)", paddingBottom: 8 }}>{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {NUTRITION_ROWS.map((row) => {
              const av = a.nutrition?.[row.key]
              const bv = b.nutrition?.[row.key]
              return (
                <tr key={row.key}>
                  <td style={{ padding: "9px 10px 9px 0", borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.62)" }}>{row.label}</td>
                  <td
                    style={{
                      padding: "9px 10px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      textAlign: "right",
                      color: av === undefined ? "rgba(255,255,255,0.4)" : C.textOnDark,
                      fontStyle: av === undefined ? "italic" : "normal",
                    }}
                  >
                    {av === undefined ? "—" : `${av}${row.unit}`}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      textAlign: "right",
                      color: bv === undefined ? "rgba(255,255,255,0.4)" : C.textOnDark,
                      fontStyle: bv === undefined ? "italic" : "normal",
                    }}
                  >
                    {bv === undefined ? "—" : `${bv}${row.unit}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductColumn({ product, isWinner }: { product: CompareProduct; isWinner?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "rgba(20,55,35,0.85)",
        border: `1.5px solid ${isWinner ? "rgba(224,167,46,0.55)" : "rgba(224,167,46,0.28)"}`,
        boxShadow: isWinner ? "0 0 0 1px rgba(224,167,46,0.25) inset" : "none",
      }}
    >
      {isWinner && (
        <div
          style={{
            position: "absolute",
            top: -11,
            left: 20,
            padding: "4px 12px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${C.greenLight}, ${C.goldDark})`,
            color: C.white,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Recommended
        </div>
      )}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 13,
          background: "rgba(20,55,35,0.8)",
          border: "1.5px dashed rgba(224,167,46,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(224,167,46,0.45)" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16.5, color: C.textOnDark }}>{product.name}</p>
          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.42)" }}>
            {[product.brand, product.quantity].filter(Boolean).join(" · ") || "Brand/size unavailable"}
          </p>
        </div>
        <ScoreRing score={product.score} />
      </div>
      <VerdictChip verdict={product.verdict} reason={product.verdictReason} />
      <div>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>
          Score Breakdown
        </p>
        <ScoreBreakdown breakdown={product.breakdown} />
      </div>
      <div>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>
          Allergens
        </p>
        <AllergenList allergens={product.allergens} />
      </div>
      <div>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>
          Ingredients
        </p>
        <IngredientsBlock text={product.ingredientsText} />
      </div>
    </div>
  )
}

// One neutral panel reused for the initial/loading/error/not-found states so
// those "nothing to compare yet" moments read as one family.
function ComparePanel({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(20,55,35,0.85)",
        border: dashed ? "1.5px dashed rgba(224,167,46,0.35)" : "1.5px solid rgba(224,167,46,0.28)",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}

type CompareScenario = "initial" | "loading" | "success-a" | "success-b" | "success-none" | "incomplete" | "not-found" | "error"

const SCENARIO_LABELS: { id: CompareScenario; label: string }[] = [
  { id: "initial", label: "Initial" },
  { id: "loading", label: "Loading" },
  { id: "success-a", label: "A recommended" },
  { id: "success-b", label: "B recommended" },
  { id: "success-none", label: "No recommendation" },
  { id: "incomplete", label: "Incomplete data" },
  { id: "not-found", label: "Product not found" },
  { id: "error", label: "Error" },
]

function ProductCompareScreen({ go }: { go: (s: Screen) => void }) {
  const isDesktop = useIsDesktop()
  const [scenario, setScenario] = useState<CompareScenario>("initial")
  // Sidebar is a collapsible drawer — hidden by default, opened via the
  // hamburger icon. It's `position: fixed` so its height is tied to the
  // viewport (100vh) rather than to AppFrame's `minHeight: 100dvh`, which
  // would otherwise let it grow as tall as the comparison content.
  const [navOpen, setNavOpen] = useState(false)

  // Sidebar drawer — shared between mobile and desktop, no Ask Bite.
  const sidebar = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: 248,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "26px 0 20px",
        background: "rgba(7,35,19,0.97)",
        borderRight: "1px solid rgba(224,167,46,0.18)",
        boxShadow: navOpen ? "10px 0 34px rgba(0,0,0,0.38)" : "none",
        transform: navOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.24s ease",
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 16px 0 22px", marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoImg} alt="Scanity logo" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 17 }}>
            <span style={{ color: C.textOnDark }}>Scan</span>
            <span style={{ color: C.greenLight }}>ity</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Close menu"
          style={{
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: C.textOnDark,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="4" y1="4" x2="20" y2="20" />
            <line x1="20" y1="4" x2="4" y2="20" />
          </svg>
        </button>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, padding: "0 12px" }}>
        {[
          { label: "Home", screen: "dashboard" as Screen, active: false },
          { label: "Compare", screen: "productCompare" as Screen, active: true },
          { label: "Profile", screen: "profile" as Screen, active: false },
          { label: "Settings", screen: "settings" as Screen, active: false },
          { label: "Help & FAQ", screen: "help" as Screen, active: false },
          { label: "About", screen: "about" as Screen, active: false },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => go(item.screen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "11px 12px",
              borderRadius: 13,
              border: item.active ? "1.5px solid rgba(224,167,46,0.55)" : "1.5px solid transparent",
              background: item.active ? "rgba(224,167,46,0.16)" : "transparent",
              color: item.active ? C.textOnDark : "rgba(255,255,255,0.62)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div
        style={{
          margin: "4px 12px 14px",
          padding: "11px 12px",
          borderRadius: 13,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(224,167,46,0.16)",
            border: "1px solid rgba(224,167,46,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.greenLight} strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textOnDark }}>Hello, User!</p>
          <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "rgba(255,255,255,0.42)" }}>user@email.com</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => go("splash")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "0 12px",
          padding: "11px 12px",
          background: "rgba(224,167,46,0.08)",
          border: "1px solid rgba(224,167,46,0.18)",
          borderRadius: 12,
          cursor: "pointer",
          color: C.textOnDark,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: 12.5,
        }}
      >
        Logout
      </button>
    </div>
  )

  const content = (() => {
    if (scenario === "initial") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {["A", "B"].map((label) => (
            <ComparePanel key={label} dashed>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(224,167,46,0.10)",
                  border: "1.5px solid rgba(224,167,46,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.greenLight} strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.textOnDark }}>Add Product {label}</h3>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.62)", maxWidth: 220, lineHeight: 1.5 }}>
                Scan a barcode or search by name to add a product to this comparison.
              </p>
              <button
                type="button"
                onClick={() => go("barcode")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 13,
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: `linear-gradient(135deg, ${C.greenLight}, ${C.goldDark})`,
                  color: C.white,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Scan or search
              </button>
            </ComparePanel>
          ))}
        </div>
      )
    }

    if (scenario === "loading") {
      const skeletonBar = (w: string, h: number) => <div style={{ width: w, height: h, borderRadius: 6, background: "rgba(255,255,255,0.08)" }} />
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 16,
                padding: 20,
                background: "rgba(20,55,35,0.85)",
                border: "1.5px solid rgba(224,167,46,0.28)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 13, background: "rgba(255,255,255,0.08)" }} />
              {skeletonBar("70%", 16)}
              {skeletonBar("45%", 11)}
              {skeletonBar("90px", 24)}
              {skeletonBar("100%", 7)}
              {skeletonBar("100%", 7)}
            </div>
          ))}
        </div>
      )
    }

    if (scenario === "error" || scenario === "not-found") {
      const isError = scenario === "error"
      return (
        <ComparePanel>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isError ? "rgba(232,69,60,0.14)" : "rgba(224,167,46,0.10)",
              border: `1.5px solid ${isError ? "rgba(232,69,60,0.4)" : "rgba(224,167,46,0.3)"}`,
              color: isError ? C.statusDanger : C.greenLight,
            }}
          >
            {isError ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textOnDark }}>{isError ? "Something went wrong" : "Product not found"}</h3>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.62)", maxWidth: 340, lineHeight: 1.6 }}>
            {isError
              ? "We couldn't load this comparison. Check your connection and try again."
              : "We couldn't find a match for the second barcode. It may not be in the database yet — try scanning again or search by name."}
          </p>
          <button
            type="button"
            onClick={() => go("barcode")}
            style={{
              padding: "10px 18px",
              borderRadius: 13,
              border: "1px solid rgba(255,255,255,0.28)",
              background: `linear-gradient(135deg, ${C.greenLight}, ${C.goldDark})`,
              color: C.white,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {isError ? "Retry" : "Try again"}
          </button>
        </ComparePanel>
      )
    }

    let a: CompareProduct = COMPARE_PRODUCT_A
    let b: CompareProduct = COMPARE_PRODUCT_B
    let recommendation: "a" | "b" | "none" = "a"
    if (scenario === "success-b") recommendation = "b"
    if (scenario === "success-none") {
      a = { ...a, score: 63, verdict: "caution" }
      b = { ...b, score: 64, verdict: "caution" }
      recommendation = "none"
    }
    if (scenario === "incomplete") {
      b = { ...b, ingredientsText: undefined, allergens: undefined, breakdown: null, score: null, verdict: null, verdictReason: undefined }
      recommendation = "none"
    }

    return (
      <>
        {scenario === "incomplete" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              marginBottom: 18,
              borderRadius: 13,
              background: "rgba(245,197,24,0.10)",
              border: "1px solid rgba(245,197,24,0.32)",
              fontSize: 11.5,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong style={{ color: C.textOnDark }}>Product B is missing data</strong> — ingredients, allergens, and nutrition score were not returned by
              the backend. Nothing has been guessed to fill the gaps.
            </span>
          </div>
        )}

        <div
          style={{
            borderRadius: 16,
            background: "rgba(20,55,35,0.85)",
            border: `1.5px solid ${recommendation === "none" ? "rgba(255,255,255,0.16)" : "rgba(224,167,46,0.35)"}`,
            padding: "16px 20px",
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: recommendation === "none" ? "rgba(255,255,255,0.08)" : "rgba(224,167,46,0.14)",
              color: recommendation === "none" ? "rgba(255,255,255,0.62)" : C.greenLight,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              {recommendation === "none" ? (
                <line x1="8" y1="12" x2="16" y2="12" />
              ) : (
                <>
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              )}
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textOnDark }}>
              {recommendation === "none" ? (
                "No clear recommendation"
              ) : (
                <>
                  <span style={{ color: C.greenLight }}>{recommendation === "a" ? a.name : b.name}</span> is the better choice
                </>
              )}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.62)" }}>
              {recommendation === "none"
                ? "Both products score too closely, or key data is missing, for Scanity to call a winner. Compare the sections below yourself."
                : "Based on nutrition score, ingredient quality, and your saved health profile."}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <ProductColumn product={a} isWinner={recommendation === "a"} />
          <ProductColumn product={b} isWinner={recommendation === "b"} />
        </div>

        <NutritionTable a={a} b={b} />

        <button
          type="button"
          style={{
            width: "100%",
            marginTop: 22,
            padding: 13,
            borderRadius: 13,
            border: "1.5px solid rgba(224,167,46,0.35)",
            background: "transparent",
            color: C.greenLight,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Add another product
        </button>

        <p style={{ margin: "18px 0 0", fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
          Backend note: name/brand/quantity/ingredients/allergens/nutrition map directly onto the existing product-lookup shape. verdict, scoreBreakdown, and
          the overall recommendation aren't defined in the API yet — they depend on the Rule Engine evaluating each product against the user's saved
          allergy/health profile. Nothing above is invented to fill that gap; the UI shows the honest "unavailable" states instead.
        </p>
      </>
    )
  })()

  return (
    <div style={{ flex: 1, display: "flex", background: "#071A0F", overflow: "hidden", position: "relative" }}>
      {sidebar}

      {/* Backdrop — click-outside-to-close, sits between the drawer and the content. */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, background: "rgba(3,15,8,0.45)", zIndex: 45 }}
        />
      )}

      {/* Hamburger toggle — fixed to the viewport, independent of page scroll/height,
          shown only while the drawer is collapsed. Available on both mobile and desktop. */}
      {!navOpen && (
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          style={{
            position: "fixed",
            top: isDesktop ? 22 : `calc(${SAFE_TOP} + 14px)`,
            left: isDesktop ? 22 : 14,
            zIndex: 55,
            width: isDesktop ? 42 : 38,
            height: isDesktop ? 42 : 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: isDesktop ? 12 : 11,
            border: "1px solid rgba(224,167,46,0.32)",
            background: "rgba(7,35,19,0.95)",
            color: C.textOnDark,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}
        >
          <svg width={isDesktop ? 18 : 16} height={isDesktop ? 14 : 12} viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="0" y1="1" x2="24" y2="1" />
            <line x1="0" y1="9" x2="24" y2="9" />
            <line x1="0" y1="17" x2="24" y2="17" />
          </svg>
        </button>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            padding: isDesktop ? "30px 40px 18px 92px" : `${SAFE_TOP} 20px 14px 60px`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 23, color: C.textOnDark }}>Compare Products</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.62)" }}>Side-by-side ingredient, nutrition, and allergy comparison.</p>
          </div>
        </div>

        {/* Preview-state switcher — a design/QA aid for reviewing every
            required state; not meant to ship to end users. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: isDesktop ? "0 40px 18px 92px" : "0 40px 18px", justifyContent: isDesktop ? "flex-end" : "flex-start" }}>
          {SCENARIO_LABELS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${scenario === s.id ? C.greenLight : "rgba(255,255,255,0.18)"}`,
                background: scenario === s.id ? "rgba(224,167,46,0.22)" : "rgba(255,255,255,0.05)",
                color: scenario === s.id ? C.textOnDark : "rgba(255,255,255,0.62)",
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: isDesktop ? "0 40px 48px 92px" : "0 16px 32px" }}>
          <Center maxWidth={1080}>{content}</Center>
        </div>
      </div>
    </div>
  )
}

type ProfileOption = { id: string; label: string }
const HISTORY_SCANS = [
  { name: "Athlene", date: "August 3, 10:35 AM", score: 72, favorite: true },
  { name: "Athlene", date: "August 3, 10:35 AM", score: 62, favorite: false },
  { name: "Athlene", date: "August 3, 10:35 AM", score: 27, favorite: false },
  { name: "Athlene", date: "August 3, 10:35 AM", score: 72, favorite: true },
]

function ScanHistoryScreen({ go }: { go: (s: Screen) => void }) {
  const [filter, setFilter] = useState<"recent" | "favourite">("recent")
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const scans = HISTORY_SCANS.filter(
    (scan) =>
      (filter === "recent" || scan.favorite) &&
      scan.name.toLowerCase().includes(query.toLowerCase()),
  )
  const scoreColor = (score: number) =>
    score >= 71 ? "#4CAF50" : score >= 42 ? "#F5C518" : "#FF4D4D"
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "#071A0F",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 15,
          paddingLeft: 18,
          paddingRight: 18,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(224,167,46,0.18)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => go("dashboard")}
            aria-label="Back"
            style={{
              width: 32,
              height: 32,
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 9,
              background: "rgba(255,255,255,0.07)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            <i className="fa fa-angle-left" />
          </button>
          <h2
            style={{
              margin: 0,
              color: C.textOnDark,
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            Scan History
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Search history"
          style={{
            border: "none",
            background: "none",
            color: C.textOnDark,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          <i className="fa fa-search" />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Center maxWidth={640} style={{ padding: "14px 16px 24px" }}>
        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scans"
            style={{
              width: "100%",
              padding: "9px 11px",
              marginBottom: 10,
              boxSizing: "border-box",
              borderRadius: 9,
              border: "1px solid rgba(224,167,46,0.35)",
              background: "rgba(22,76,41,0.78)",
              color: C.textOnDark,
              outline: "none",
              fontSize: 10,
            }}
          />
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {(["recent", "favourite"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: `1px solid ${
                  filter === option ? C.greenLight : "rgba(255,255,255,0.35)"
                }`,
                background:
                  filter === option ? "rgba(224,167,46,0.2)" : "transparent",
                color: filter === option ? C.greenLight : "rgba(255,255,255,0.65)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, }}>
          {scans.map((scan, index) => (
            <button
              key={`${scan.name}-${index}`}
              type="button"
              onClick={() => go("productResult")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                minHeight: 62,
                padding: "20px 40px",
                borderRadius: 12,
                border: "1px solid rgba(224,167,46,0.3)",
                background: "rgba(22,76,41,0.78)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                color: C.textOnDark,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px dashed rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}
              >
                <i
                  className="fa fa-picture-o"
                  style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>
                  {scan.name}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: 8,
                  }}
                >
                  {scan.date}
                </p>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: `2px solid ${scoreColor(scan.score)}`,
                  color: scoreColor(scan.score),
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {scan.score}
              </div>
            </button>
          ))}
          {scans.length === 0 && (
            <p
              style={{
                margin: "30px 0",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                textAlign: "center",
              }}
            >
              No scans found.
            </p>
          )}
        </div>
        </Center>
      </div>
    </div>
  )
}

const PROFILE_ALLERGIES: ProfileOption[] = [
  { id: "peanuts", label: "Peanuts" },
  { id: "dairy", label: "Dairy" },
  { id: "gluten", label: "Gluten" },
]
const PROFILE_HEALTH: ProfileOption[] = [
  { id: "hypertension", label: "Hypertension" },
  { id: "diabetes", label: "Diabetes" },
]
function ProfileScreen({ go }: { go: (s: Screen) => void }) {
  const [allergies, setAllergies] = useState(["peanuts", "dairy"])
  const [health, setHealth] = useState(["hypertension"])
  const [dialog, setDialog] = useState<"allergy" | "health" | null>(null)
  const [query, setQuery] = useState("")
  const options = dialog === "allergy" ? PROFILE_ALLERGIES : PROFILE_HEALTH
  const selected = dialog === "allergy" ? allergies : health
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  )
  const toggleOption = (id: string) => {
    if (dialog === "allergy") {
      setAllergies((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      )
    } else {
      setHealth((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      )
    }
  }
  const closeDialog = () => {
    setDialog(null)
    setQuery("")
  }
  const Check = ({ active }: { active: boolean }) => (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `1.5px solid ${
          active ? C.greenLight : "rgba(255,255,255,0.45)"
        }`,
        background: active ? C.greenLight : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {active && (
        <i className="fa fa-check" style={{ color: "#071A0F", fontSize: 11 }} />
      )}
    </span>
  )
  const Section = ({
    title,
    items,
    onAdd,
  }: {
    title: string
    items: ProfileOption[]
    onAdd: () => void
  }) => (
    <section style={{ marginBottom: 20 }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 700,
          color: C.textOnDark,
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((item) => {
          const active = (title === "Allergies" ? allergies : health).includes(
            item.id,
          )
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                title === "Allergies"
                  ? setAllergies((current) =>
                      current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id],
                    )
                  : setHealth((current) =>
                      current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id],
                    )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "5px 0",
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "left",
                cursor: "pointer",
                fontSize: 10,
              }}
            >
              <Check active={active} />
              {item.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            padding: "5px 0",
            border: "none",
            background: "none",
            color: "rgba(255,255,255,0.65)",
            textAlign: "left",
            cursor: "pointer",
            fontSize: 10,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: "1.5px solid rgba(255,255,255,0.45)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa fa-plus" style={{ fontSize: 9 }} />
          </span>
          Add
        </button>
      </div>
    </section>
  )
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "#071A0F",
        color: C.textOnDark,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingTop: 13,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 13,
          flexShrink: 0,
          borderBottom: "1px solid rgba(224,167,46,0.18)",
        }}
      >
        <button
          type="button"
          onClick={() => go("dashboard")}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.07)",
            padding: 0,
            cursor: "pointer",
            color: "#fff",
            fontSize: 20,
          }}
        >
          <i className="fa fa-angle-left" />
        </button>
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            My Profile
          </h2>
          <p
            style={{
              margin: "1px 0 0",
              fontSize: 8,
              color: "rgba(255,255,255,0.48)",
            }}
          >
            Manage your nutrition preferences
          </p>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Center maxWidth={640} style={{ padding: "16px 16px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px",
            marginBottom: 18,
            borderRadius: 13,
            border: "1px solid rgba(224,167,46,0.28)",
            background: "rgba(22,76,41,0.78)",
            boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "6px solid #E0A72E",
              background: "rgba(224,167,46,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="fa fa-user"
              style={{ color: C.greenLight, fontSize: 24 }}
            />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
              Cedric Hamilton
            </p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 9,
                color: "rgba(255,255,255,0.52)",
              }}
            >
              cedrichamilton@gmail.com
            </p>
          </div>
        </div>
        <Section
          title="Allergies"
          items={PROFILE_ALLERGIES}
          onAdd={() => setDialog("allergy")}
        />
        <Section
          title="Health Condition"
          items={PROFILE_HEALTH}
          onAdd={() => setDialog("health")}
        />
        <button
          type="button"
          onClick={() => go("dashboard")}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 13,
            border: "none",
            background: "linear-gradient(135deg, #E0A72E, #C98A1F)",
            color: "#071A0F",
            fontFamily: "'Poppins', sans-serif",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(224,167,46,0.24)",
          }}
        >
          Save changes
        </button>
        </Center>
      </div>
      {dialog && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "58%",
              overflowY: "auto",
              padding: "14px 12px 16px",
              border: "1px solid rgba(224,167,46,0.35)",
              borderRadius: "14px 14px 0 0",
              background: "rgba(7,35,19,0.98)",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.35)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textOnDark,
                }}
              >
                Add {dialog === "allergy" ? "Allergies" : "Health Conditions"}
              </p>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "none",
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 9px",
                border: "1px solid rgba(224,167,46,0.28)",
                borderRadius: 9,
                background: "rgba(22,76,41,0.78)",
                marginBottom: 7,
              }}
            >
              <i
                className="fa fa-search"
                style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: C.textOnDark,
                  fontSize: 10,
                }}
              />
            </div>
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "9px 3px",
                  border: "none",
                  borderBottom: "1px solid rgba(224,167,46,0.14)",
                  background: "none",
                  color: C.textOnDark,
                  textAlign: "left",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {option.label}
                <Check active={selected.includes(option.id)} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const FAQ_ITEMS = [
  {
    question: "How do I scan a product?",
    answer:
      "Open the scanner from your dashboard and point your camera at the barcode. Scanity will show the product score and relevant alerts.",
  },
  {
    question: "How are allergy alerts chosen?",
    answer:
      "Scanity compares product ingredients with the allergies and health conditions saved in your profile.",
  },
  {
    question: "Can I update my preferences?",
    answer:
      "Yes. Open My Profile from the menu, update your selections, and tap Save changes.",
  },
  {
    question: "What does the product score mean?",
    answer:
      "The score summarizes how well a product fits your saved preferences. Review the individual alerts for more detail.",
  },
]
function InfoHeader({
  title,
  subtitle,
  go,
}: {
  title: string
  subtitle: string
  go: (s: Screen) => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingTop: SAFE_TOP,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 13,
        borderBottom: "1px solid rgba(13, 13, 11, 0.18)",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => go("dashboard")}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.07)",
          color: "#1c4221",
          cursor: "pointer",
          fontSize: 20,
        }}
      >
        <i className="fa fa-angle-left" />
      </button>
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 17,
            fontWeight: 800,
            color: "#0c0c0c",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: 8,
            color: "rgb(238, 237, 237)",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  )
}

function HelpFaqScreen({ go }: { go: (s: Screen) => void }) {
  const [openQuestion, setOpenQuestion] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)
  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#e8e5e0",
    sidebarBg: "#176B3A",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",
    cardWhite: "#FFFFFF",
    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E3DC",
  }

  const sidebarItems = [
    { icon: "fa-home", label: "Dashboard", screen: "dashboard" as Screen },
    { icon: "fa-gear", label: "Settings", screen: "settings" as Screen },
    { icon: "fa-question-circle", label: "Help & FAQ", screen: "help" as Screen },
  ]

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)
    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  const sidebarMenu = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isDesktop ? "20px 20px 24px" : "18px 16px 22px" }}>
        <img src={logoImg} alt="Scanity" style={{ width: isDesktop ? 48 : 42, height: isDesktop ? 48 : 42, objectFit: "contain", flexShrink: 0 }} />
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: isDesktop ? 22 : 18, letterSpacing: "-0.01em", lineHeight: 1, whiteSpace: "nowrap" }}>
          <span style={{ color: "#FFFFFF" }}>Scan</span>
          <span style={{ color: PALETTE.greenLight === "#2E8B57" ? "#9CE6B8" : PALETTE.greenLight }}>ity</span>
        </span>
      </div>

      <p style={{ margin: 0, padding: isDesktop ? "0 20px 10px" : "0 16px 10px", fontFamily: FONT, fontWeight: 600, fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.50)" }}>
        MENU
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: isDesktop ? "0 10px" : "0 9px" }}>
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isDesktop ? "12px 14px" : "11px 12px",
              background: item.screen === "help" ? "rgba(255,255,255,0.14)" : "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <i className={`fa ${item.icon}`} style={{ fontSize: 15, width: 19, textAlign: "center", color: "#FFFFFF" }} />
            <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: isDesktop ? 13 : 12, color: "#FFFFFF" }}>
              {item.label}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isDesktop ? "12px 14px" : "11px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <i className="fa fa-sign-out" style={{ fontSize: 15, width: 19, textAlign: "center", color: "#FFFFFF", transform: "scaleX(-1)" }} />
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: isDesktop ? 13 : 12, color: "#FFFFFF" }}>
            Logout
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: PALETTE.pageBg, fontFamily: FONT }}>
      <style>
        {`
          @keyframes scanityFadeUp { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: translateY(0);} }
          @keyframes scanitySidebarSlideIn { from { opacity: 0; transform: translateX(-45px);} to { opacity: 1; transform: translateX(0);} }
          @keyframes scanityBackdropIn { from { opacity: 0;} to { opacity: 1;} }
          @keyframes scanityCardIn { from { opacity: 0; transform: translateY(10px) scale(0.98);} to { opacity: 1; transform: translateY(0) scale(1);} }
          @keyframes logoutProgress { from { width: 0%; } to { width: 100%; } }
          .scanity-sidebar-item { transition: background 0.18s ease, transform 0.15s ease; }
          .scanity-sidebar-item:hover { background: rgba(255,255,255,0.10) !important; transform: translateX(3px); }
          .scanity-sidebar-item:active { transform: scale(0.97); }
          .scanity-faq-item, .scanity-hamburger { transition: transform 0.18s ease, box-shadow 0.18s ease; }
          .scanity-faq-item:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(0,0,0,0.08) !important; }
          .scanity-hamburger:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important; }
          .scanity-hamburger:active { transform: scale(0.94); }
        `}
      </style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex" }}>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "scanityBackdropIn 0.2s ease-out both" }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${isDesktop ? 32 : 20}px)`,
              margin: isDesktop ? "16px" : "10px",
              background: `linear-gradient(160deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)`,
              borderRadius: 26,
              boxShadow: "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingBottom: 24,
              boxSizing: "border-box",
              overflow: "hidden",
              animation: "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", top: -90, right: -80, background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", bottom: 10, left: -75, background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
            {sidebarMenu}
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(20,20,20,0.5)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <div style={{ width: "100%", maxWidth: 310, padding: "28px 22px 22px", borderRadius: 28, background: PALETTE.cardWhite, boxShadow: "0 25px 65px rgba(0,0,0,0.20)", textAlign: "center", boxSizing: "border-box", fontFamily: FONT }}>
            <div style={{ width: 70, height: 70, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(23,107,58,0.10)", border: `2px solid ${PALETTE.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa fa-sign-out" style={{ fontSize: 30, color: PALETTE.green }} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontFamily: FONT, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", color: PALETTE.textDark, lineHeight: 1.35 }}>
              Are you sure you want to logout?
            </h2>
            <p style={{ margin: "0 auto 20px", maxWidth: 240, fontFamily: FONT, fontWeight: 400, fontSize: 11, lineHeight: "16px", color: PALETTE.textMuted }}>
              You will need to login again<br />to access your account.
            </p>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button type="button" onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, height: 44, border: "1px solid #DADADA", borderRadius: 14, background: "#F5F5F5", color: PALETTE.textDark, fontFamily: FONT, fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={handleLogout} style={{ flex: 1, height: 44, border: "none", borderRadius: 14, background: `linear-gradient(135deg, ${PALETTE.greenDark}, ${PALETTE.greenLight})`, color: "#FFFFFF", fontFamily: FONT, fontWeight: 600, fontSize: 12, cursor: "pointer", boxShadow: "0 8px 22px rgba(21,91,50,0.28)" }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {showLogoutLoading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(20,20,20,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <div style={{ width: "100%", maxWidth: 300, padding: "30px 22px 24px", borderRadius: 28, background: PALETTE.cardWhite, boxShadow: "0 25px 65px rgba(0,0,0,0.20)", textAlign: "center", boxSizing: "border-box", fontFamily: FONT }}>
            <div style={{ width: 70, height: 70, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(23,107,58,0.08)", border: `2px solid ${PALETTE.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa fa-sign-out" style={{ fontSize: 29, color: PALETTE.green }} />
            </div>
            <h2 style={{ margin: "0 0 7px", fontFamily: FONT, fontWeight: 700, fontSize: 17, color: PALETTE.textDark }}>Logging Out</h2>
            <p style={{ margin: "0 0 19px", fontFamily: FONT, fontWeight: 400, fontSize: 11, color: PALETTE.textMuted }}>Please wait...</p>
            <div style={{ width: "100%", height: 8, borderRadius: 8, overflow: "hidden", background: "#EDEDED", border: "1px solid #DADADA" }}>
              <div style={{ width: "0%", height: "100%", borderRadius: 8, background: `linear-gradient(90deg, ${PALETTE.greenDark}, ${PALETTE.greenLight})`, animation: "logoutProgress 1.8s linear forwards" }} />
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ paddingTop: SAFE_TOP, paddingLeft: isDesktop ? 40 : 20, paddingRight: isDesktop ? 40 : 20, paddingBottom: 10, display: "flex", alignItems: "center", gap: 14, marginTop: isDesktop ? 18 : 12, animation: "scanityFadeUp 0.5s ease-out both", flexShrink: 0 }}>
        <button
          type="button"
          className="scanity-hamburger"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          style={{ width: 42, height: 42, background: PALETTE.cardWhite, border: "1px solid #E0E0E0", borderRadius: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", padding: 0 }}
        >
          <div style={{ width: 20, display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ display: "block", width: 20, height: 2.5, borderRadius: 5, background: PALETTE.textDark }} />
            <span style={{ display: "block", width: 20, height: 2.5, borderRadius: 5, background: PALETTE.textDark }} />
            <span style={{ display: "block", width: 20, height: 2.5, borderRadius: 5, background: PALETTE.textDark }} />
          </div>
        </button>

        <div>
          <h2 style={{ margin: 0, fontFamily: FONT, fontSize: isDesktop ? 24 : 19, fontWeight: 800, color: PALETTE.textDark, letterSpacing: "-0.02em" }}>
            Help &amp; FAQ
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: PALETTE.greenText, fontWeight: 500 }}>
            Answers for a safer scan
          </p>
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", padding: isDesktop ? "8px 40px 40px" : "4px 16px 30px", boxSizing: "border-box" }}>

          {/* HERO */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "26px 26px",
              marginBottom: 24,
              borderRadius: 26,
              background: `linear-gradient(145deg, ${PALETTE.greenDark} 0%, ${PALETTE.green} 45%, ${PALETTE.greenLight} 100%)`,
              boxShadow: "0 14px 34px rgba(21,91,50,0.24)",
              animation: "scanityCardIn 0.5s ease-out 0.05s both",
            }}
          >
            <div style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", right: -55, top: -65, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", right: 45, bottom: -55, background: "rgba(255,255,255,0.06)" }} />

            <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.16)", marginBottom: 16 }}>
              <i className="fa fa-question-circle" style={{ color: "#FFFFFF", fontSize: 25 }} />
            </div>

            <p style={{ margin: "0 0 6px", color: "#FFFFFF", fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em" }}>
              How can we help?
            </p>

            <p style={{ margin: 0, maxWidth: 560, color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 1.6 }}>
              Find quick answers about scanning products, understanding product scores, allergy alerts, and managing your preferences.
            </p>
          </div>

          {/* FAQ HEADER */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13, padding: "0 3px" }}>
            <div>
              <p style={{ margin: 0, color: PALETTE.textDark, fontSize: 15, fontWeight: 800 }}>
                Frequently asked questions
              </p>
              <p style={{ margin: "4px 0 0", color: PALETTE.textMuted, fontSize: 10 }}>
                Tap a question to view the answer
              </p>
            </div>
            <div style={{ padding: "5px 9px", borderRadius: 20, background: "rgba(23,107,58,0.10)", color: PALETTE.greenText, fontSize: 9, fontWeight: 700 }}>
              {FAQ_ITEMS.length} questions
            </div>
          </div>

          {/* FAQ LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_ITEMS.map((item, index) => {
              const open = openQuestion === index
              return (
                <div
                  key={item.question}
                  className="scanity-faq-item"
                  style={{
                    borderRadius: 18,
                    border: open ? `1px solid ${PALETTE.greenLight}` : `1px solid ${PALETTE.border}`,
                    background: PALETTE.cardWhite,
                    overflow: "hidden",
                    boxShadow: open ? "0 10px 26px rgba(21,91,50,0.14)" : "0 4px 12px rgba(0,0,0,0.05)",
                    animation: `scanityCardIn 0.4s ease-out ${0.1 + index * 0.05}s both`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(open ? -1 : index)}
                    style={{ display: "flex", alignItems: "center", width: "100%", gap: 13, padding: "16px 17px", border: "none", background: "transparent", color: PALETTE.textDark, textAlign: "left", cursor: "pointer" }}
                  >
                    <div style={{ flexShrink: 0, width: 31, height: 31, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: open ? PALETTE.green : "#EFEFEA", color: open ? "#FFFFFF" : PALETTE.textMuted, fontSize: 10, fontWeight: 800 }}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
                      {item.question}
                    </span>
                    <div style={{ flexShrink: 0, width: 27, height: 27, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: open ? "rgba(23,107,58,0.10)" : "#F5F5F0" }}>
                      <i className={`fa fa-angle-${open ? "up" : "down"}`} style={{ color: PALETTE.greenText, fontSize: 14 }} />
                    </div>
                  </button>

                  {open && (
                    <div style={{ padding: "0 17px 18px 61px" }}>
                      <div style={{ height: 1, marginBottom: 13, background: PALETTE.border }} />
                      <p style={{ margin: 0, color: PALETTE.textMuted, fontSize: 11, lineHeight: 1.7 }}>
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* SUPPORT CARD */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              marginTop: 24,
              padding: "21px",
              borderRadius: 20,
              background: PALETTE.cardWhite,
              border: `1px solid ${PALETTE.border}`,
              boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flexShrink: 0, width: 43, height: 43, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(23,107,58,0.10)" }}>
                <i className="fa fa-headphones" style={{ color: PALETTE.greenText, fontSize: 19 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: PALETTE.textDark, fontSize: 12, fontWeight: 800 }}>
                  Still need help?
                </p>
                <p style={{ margin: "4px 0 0", color: PALETTE.textMuted, fontSize: 10, lineHeight: 1.5 }}>
                  Our support team is here to help you.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, padding: "11px 13px", borderRadius: 12, background: "#F7F6F2", border: `1px solid ${PALETTE.border}` }}>
              <i className="fa fa-envelope" style={{ color: PALETTE.greenText, fontSize: 12 }} />
              <span style={{ color: PALETTE.textDark, fontSize: 10, fontWeight: 500 }}>
                scanityapp@gmail.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function AboutScreen({ go }: { go: (s: Screen) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)
  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#e8e5e0",
    sidebarBg: "#176B3A",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",
    cardWhite: "#FFFFFF",
    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E3DC",
  }

  const sidebarItems = [
    { icon: "fa-home", label: "Dashboard", screen: "dashboard" as Screen },
    { icon: "fa-gear", label: "Settings", screen: "settings" as Screen },
    { icon: "fa-question-circle", label: "Help & FAQ", screen: "help" as Screen },
  ]

  const features = [
    {
      icon: "fa-search",
      title: "Scan & Read",
      text: "Scan a barcode or capture the product label using OCR.",
    },
    {
      icon: "fa-shield",
      title: "Personalized Safety",
      text: "Ingredients are checked against your allergy and health profile.",
    },
    {
      icon: "fa-lightbulb-o",
      title: "Understand Ingredients",
      text: "Complex ingredient names are explained in simple language.",
    },
    {
      icon: "fa-bar-chart",
      title: "Health Rating",
      text: "Get an overall rating based on your personal profile.",
    },
    {
      icon: "fa-magic",
      title: "AI Explanation",
      text: "Understand why Scanity gives each recommendation.",
    },
  ]

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  const sidebarMenu = (
    <>
      {/* SIDEBAR LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Scan</span>
          <span style={{ color: "#9CE6B8" }}>ity</span>
        </span>
      </div>

      {/* MENU LABEL */}
      <p
        style={{
          margin: 0,
          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* SIDEBAR ITEMS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: isDesktop ? "0 10px" : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isDesktop ? "12px 14px" : "11px 12px",
              background:
                item.screen === "about"
                  ? "rgba(255,255,255,0.14)"
                  : "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: isDesktop ? 13 : 12,
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* LOGOUT */}
        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isDesktop ? "12px 14px" : "11px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              textAlign: "center",
              color: "#FFFFFF",
              transform: "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: isDesktop ? 13 : 12,
              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: PALETTE.pageBg,
        fontFamily: FONT,
      }}
    >
      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes scanityFadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanityBackdropIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes scanityCardIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes logoutProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform: scale(0.97);
          }

          .scanity-about-card {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-about-card:hover {
            transform: translateY(-2px);
            box-shadow:
              0 12px 26px rgba(0,0,0,0.08) !important;
          }

          .scanity-hamburger {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-hamburger:hover {
            transform: translateY(-2px);
            box-shadow:
              0 8px 20px rgba(0,0,0,0.08) !important;
          }

          .scanity-hamburger:active {
            transform: scale(0.94);
          }
        `}
      </style>

      {/* ================= SIDEBAR ================= */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          {/* BACKDROP */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation:
                "scanityBackdropIn 0.2s ease-out both",
            }}
          />

          {/* SIDEBAR */}
          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop ? "16px" : "10px",
              background:
                "linear-gradient(160deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)",
              borderRadius: 26,
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingBottom: 24,
              boxSizing: "border-box",
              overflow: "hidden",
              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* DECORATIVE CIRCLES */}
            <div
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                top: -90,
                right: -80,
                background: "rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                bottom: 10,
                left: -75,
                background: "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ================= LOGOUT CONFIRM ================= */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.5)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: "28px 22px 22px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "rgba(23,107,58,0.10)",
                border: `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,
                  color: PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontWeight: 700,
                fontSize: 18,
                color: PALETTE.textDark,
                lineHeight: 1.35,
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: 240,
                fontWeight: 400,
                fontSize: 11,
                lineHeight: "16px",
                color: PALETTE.textMuted,
              }}
            >
              You will need to login again
              <br />
              to access your account.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #DADADA",
                  borderRadius: 14,
                  background: "#F5F5F5",
                  color: PALETTE.textDark,
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 14,
                  background: `linear-gradient(
                    135deg,
                    ${PALETTE.greenDark},
                    ${PALETTE.greenLight}
                  )`,
                  color: "#FFFFFF",
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 22px rgba(21,91,50,0.28)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGOUT LOADING ================= */}
      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "30px 22px 24px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "rgba(23,107,58,0.08)",
                border: `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 29,
                  color: PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 7px",
                fontWeight: 700,
                fontSize: 17,
                color: PALETTE.textDark,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin: "0 0 19px",
                fontWeight: 400,
                fontSize: 11,
                color: PALETTE.textMuted,
              }}
            >
              Please wait...
            </p>

            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 8,
                overflow: "hidden",
                background: "#EDEDED",
                border: "1px solid #DADADA",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  borderRadius: 8,
                  background: `linear-gradient(
                    90deg,
                    ${PALETTE.greenDark},
                    ${PALETTE.greenLight}
                  )`,
                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TOP BAR ================= */}
      <div
        style={{
          paddingTop: SAFE_TOP,
          paddingLeft: isDesktop ? 40 : 20,
          paddingRight: isDesktop ? 40 : 20,
          paddingBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isDesktop ? 18 : 12,
          animation:
            "scanityFadeUp 0.5s ease-out both",
          flexShrink: 0,
        }}
      >
        {/* HAMBURGER */}
        <button
          type="button"
          className="scanity-hamburger"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          style={{
            width: 42,
            height: 42,
            background: PALETTE.cardWhite,
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 20,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />

            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />

            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />
          </div>
        </button>

        {/* TITLE */}
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: FONT,
              fontSize: isDesktop ? 24 : 19,
              fontWeight: 800,
              color: PALETTE.textDark,
              letterSpacing: "-0.02em",
            }}
          >
            About Scanity
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: PALETTE.greenText,
              fontWeight: 500,
            }}
          >
            Smarter choices. Safer food.
          </p>
        </div>
      </div>

      {/* ================= SCROLLABLE BODY ================= */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
            padding: isDesktop
              ? "8px 40px 40px"
              : "4px 16px 30px",
            boxSizing: "border-box",
          }}
        >
          {/* ================= HERO ================= */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: isDesktop
                ? "30px 28px"
                : "26px 22px",
              marginBottom: 24,
              borderRadius: 26,
              background: `linear-gradient(
                145deg,
                ${PALETTE.greenDark} 0%,
                ${PALETTE.green} 45%,
                ${PALETTE.greenLight} 100%
              )`,
              boxShadow:
                "0 14px 34px rgba(21,91,50,0.24)",
              animation:
                "scanityCardIn 0.5s ease-out 0.05s both",
            }}
          >
            {/* DECORATIVE CIRCLES */}
            <div
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: "50%",
                right: -60,
                top: -75,
                background:
                  "rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                right: 50,
                bottom: -60,
                background:
                  "rgba(255,255,255,0.06)",
              }}
            />

            <p
              style={{
                position: "relative",
                margin: "0 0 6px",
                color: "#FFFFFF",
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              About Scanity
            </p>

            <p
              style={{
                position: "relative",
                margin: 0,
                maxWidth: 600,
                color:
                  "rgba(255,255,255,0.85)",
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              Scanity helps you make smarter and safer
              food choices by turning product information
              into simple, personalized insights.
            </p>
          </div>

          {/* ================= ABOUT SECTION ================= */}
          <div
            className="scanity-about-card"
            style={{
              padding: "20px",
              marginBottom: 24,
              borderRadius: 20,
              background: PALETTE.cardWhite,
              border: `1px solid ${PALETTE.border}`,
              boxShadow:
                "0 8px 22px rgba(0,0,0,0.05)",
              animation:
                "scanityCardIn 0.45s ease-out 0.1s both",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 43,
                  height: 43,
                  borderRadius: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "rgba(23,107,58,0.10)",
                }}
              >
                <i
                  className="fa fa-info-circle"
                  style={{
                    color: PALETTE.greenText,
                    fontSize: 19,
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    color: PALETTE.textDark,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  What is Scanity?
                </p>

                <p
                  style={{
                    margin: "3px 0 0",
                    color: PALETTE.textMuted,
                    fontSize: 10,
                  }}
                >
                  Your personal food safety companion
                </p>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: PALETTE.textMuted,
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Scanity is designed to help you determine
              whether packaged food is personally safe
              and suitable for you. It combines scanning,
              ingredient analysis, health ratings, and
              personalized recommendations in one simple
              experience.
            </p>
          </div>

          {/* ================= FEATURES HEADER ================= */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 13,
              padding: "0 3px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: PALETTE.textDark,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                What Scanity can do
              </p>

              <p
                style={{
                  margin: "4px 0 0",
                  color: PALETTE.textMuted,
                  fontSize: 10,
                }}
              >
                Tools designed to make food choices easier
              </p>
            </div>

            <div
              style={{
                padding: "5px 9px",
                borderRadius: 20,
                background:
                  "rgba(23,107,58,0.10)",
                color: PALETTE.greenText,
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {features.length} features
            </div>
          </div>

          {/* ================= FEATURES ================= */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="scanity-about-card"
                style={{
                  padding: "16px 17px",
                  borderRadius: 18,
                  border:
                    "1px solid " +
                    PALETTE.border,
                  background: PALETTE.cardWhite,
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.05)",
                  animation: `scanityCardIn 0.4s ease-out ${
                    0.15 + index * 0.05
                  }s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                  }}
                >
                  {/* ICON */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "rgba(23,107,58,0.10)",
                    }}
                  >
                    <i
                      className={`fa ${feature.icon}`}
                      style={{
                        color: PALETTE.greenText,
                        fontSize: 16,
                      }}
                    />
                  </div>

                  {/* TEXT */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: PALETTE.textDark,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {feature.title}
                    </p>

                    <p
                      style={{
                        margin: "4px 0 0",
                        color: PALETTE.textMuted,
                        fontSize: 10,
                        lineHeight: 1.55,
                      }}
                    >
                      {feature.text}
                    </p>
                  </div>

                  {/* NUMBER */}
                  <span
                    style={{
                      alignSelf: "flex-start",
                      color: "#BDBDBD",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ================= MISSION CARD ================= */}
          <div
            className="scanity-about-card"
            style={{
              position: "relative",
              overflow: "hidden",
              marginTop: 24,
              padding: "22px",
              borderRadius: 20,
              background: PALETTE.cardWhite,
              border: `1px solid ${PALETTE.border}`,
              boxShadow:
                "0 10px 26px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                right: -45,
                top: -45,
                background:
                  "rgba(23,107,58,0.05)",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 43,
                  height: 43,
                  borderRadius: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "rgba(23,107,58,0.10)",
                }}
              >
                <i
                  className="fa fa-heart"
                  style={{
                    color: PALETTE.greenText,
                    fontSize: 18,
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  position: "relative",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: PALETTE.textDark,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Our goal
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: PALETTE.textMuted,
                    fontSize: 10,
                    lineHeight: 1.55,
                  }}
                >
                  Making food information easier to
                  understand so you can make confident
                  choices.
                </p>
              </div>
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div
            style={{
              textAlign: "center",
              padding: "26px 0 8px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: PALETTE.greenText,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Your health. Your choice.
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: PALETTE.textMuted,
                fontSize: 9,
              }}
            >
              Scanity • Smarter choices. Safer food.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Legal Screen ─────────────────────────────────────────────────────────────

function LegalScreen({
  go,
  kind,
}: {
  go: (s: Screen) => void
  kind: "privacy" | "terms"
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)
  const [openSection, setOpenSection] = useState<number | null>(0)

  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#e8e5e0",
    sidebarBg: "#176B3A",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",
    cardWhite: "#FFFFFF",
    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E3DC",
  }

  const privacy = kind === "privacy"

  // ──────────────────────────────────────────────────────────────────────────
  // LEGAL SECTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const sections = privacy
    ? [
        [
          "Information we use",
          "Scanity uses information you provide in your profile, such as allergies, dietary preferences, and health-related selections, together with product scan results to provide personalized food safety and nutrition guidance.",
        ],
        [
          "Product scan information",
          "When you scan a barcode or capture a food label, Scanity may process product information such as ingredients, nutrition facts, and other details needed to evaluate the product.",
        ],
        [
          "Personalized health profile",
          "Your selected allergies, dietary preferences, and health conditions are used to personalize product evaluations. Keeping your profile accurate helps Scanity provide more relevant results.",
        ],
        [
          "How we use your information",
          "Information is used to support product scanning, ingredient analysis, nutrition evaluation, personalized recommendations, and explanations. We do not sell your personal information.",
        ],
        [
          "AI-powered analysis",
          "Scanity may use AI-based analysis to explain ingredients, nutrition information, and product recommendations in simpler language. AI-generated information is intended to support your understanding and should not replace professional medical or nutritional advice.",
        ],
        [
          "How we protect your data",
          "Your information is handled with care and is used only to support your Scanity experience. We aim to protect account and profile information through appropriate security practices.",
        ],
        [
          "Your choices",
          "You can review and update your profile preferences at any time. You may also manage your account information and delete your account through the available Settings options.",
        ],
        [
          "Data accuracy",
          "Scanity depends on product information obtained from available sources and scanned labels. Product information may sometimes be incomplete, outdated, or inaccurate, so users should always verify important information directly from the product packaging.",
        ],
        [
          "Third-party services",
          "Some Scanity features may rely on external services such as food databases, scanning services, or AI services. Information processed through these services may be subject to their own terms and privacy policies.",
        ],
        [
          "Privacy updates",
          "This Privacy Policy may be updated as Scanity's features and services develop. Changes will be reflected on this screen together with the latest update date.",
        ],
      ]
    : [
        [
          "Using Scanity",
          "Scanity provides informational guidance about packaged food products to help users understand ingredients, nutrition information, and potential food-related risks. Always review product labels and use your own judgment.",
        ],
        [
          "Personalized recommendations",
          "Recommendations are based on the allergies, dietary preferences, and health conditions saved in your profile. Keep your information accurate and up to date for more relevant results.",
        ],
        [
          "Food allergy warnings",
          "Scanity may identify ingredients that could be associated with your saved allergies. Because product information can change or be incomplete, always check the actual product label before consuming a product.",
        ],
        [
          "Nutrition information",
          "Nutrition scores and evaluations are intended to make nutrition information easier to understand. They are not medical diagnoses, prescriptions, or personalized medical treatment.",
        ],
        [
          "Ingredient explanations",
          "Scanity may explain technical or unfamiliar ingredient names in simpler language, including their possible purpose or common source. These explanations are provided for general information.",
        ],
        [
          "AI-powered explanations",
          "AI-generated explanations are designed to help users understand why a product may be classified as Safe, Caution, or Avoid. AI results may not always be completely accurate and should be verified using the product label and reliable sources.",
        ],
        [
          "Barcode and OCR scanning",
          "Barcode scanning and OCR label recognition are provided to make product analysis easier. Scanning results may occasionally contain missing or incorrectly recognized information, especially when labels are damaged, unclear, or difficult to read.",
        ],
        [
          "Product comparison",
          "When available, Scanity may compare products based on nutrition information, ingredients, allergen risks, and your personal profile. A comparison is intended as decision support and does not guarantee that one product is medically suitable for you.",
        ],
        [
          "Health and medical decisions",
          "Scanity is not a substitute for a doctor, dietitian, pharmacist, or other qualified healthcare professional. If you have a serious allergy, medical condition, or dietary restriction, consult a qualified professional before making important health decisions.",
        ],
        [
          "Product information",
          "Product ingredients, nutrition facts, and formulations may change over time. Always verify the information printed on the product packaging before purchasing or consuming food.",
        ],
        [
          "Service updates",
          "Features, content, databases, and system functions may change as we improve the Scanity experience. Some features may be added, modified, temporarily unavailable, or removed.",
        ],
        [
          "User responsibility",
          "Users are responsible for reviewing product labels and considering their own dietary and health needs. Scanity should be used as a supporting tool rather than the sole basis for a food or health decision.",
        ],
        [
          "Acceptance of these terms",
          "By using Scanity, you acknowledge that the system provides informational and decision-support features and that you understand the limitations of automated product analysis.",
        ],
      ]

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR ITEMS
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR MENU
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarMenu = (
    <>
      {/* LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Scan</span>
          <span style={{ color: "#9CE6B8" }}>ity</span>
        </span>
      </div>

      {/* MENU TITLE */}
      <p
        style={{
          margin: 0,
          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* MENU ITEMS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: isDesktop
            ? "0 10px"
            : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isDesktop
                ? "12px 14px"
                : "11px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              boxSizing: "border-box",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                minWidth: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: isDesktop ? 13 : 12,
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* LOGOUT */}
        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isDesktop
              ? "12px 14px"
              : "11px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            boxSizing: "border-box",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              minWidth: 19,
              textAlign: "center",
              color: "#FFFFFF",
              transform: "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: isDesktop ? 13 : 12,
              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: PALETTE.pageBg,
        fontFamily: FONT,
      }}
    >
      {/* ─────────────────────────────────────────────────────────────────────
          ANIMATIONS
      ───────────────────────────────────────────────────────────────────── */}

      <style>
        {`
          @keyframes scanityFadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanityBackdropIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes scanityCardIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes logoutProgress {
            from {
              width: 0%;
            }

            to {
              width: 100%;
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform: scale(0.97);
          }

          .scanity-legal-card {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-legal-card:hover {
            transform: translateY(-2px);
            box-shadow:
              0 12px 26px rgba(0,0,0,0.08) !important;
          }

          .scanity-legal-toggle {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-legal-toggle:hover {
            background:
              rgba(23,107,58,0.14) !important;
          }

          .scanity-legal-toggle:active {
            transform: scale(0.94);
          }

          .scanity-hamburger {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-hamburger:hover {
            transform: translateY(-2px);

            box-shadow:
              0 8px 20px rgba(0,0,0,0.08) !important;
          }

          .scanity-hamburger:active {
            transform: scale(0.94);
          }
        `}
      </style>

      {/* ─────────────────────────────────────────────────────────────────────
          SIDEBAR
      ───────────────────────────────────────────────────────────────────── */}

      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          {/* BACKDROP */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation:
                "scanityBackdropIn 0.2s ease-out both",
            }}
          />

          {/* SIDEBAR */}
          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop
                ? "16px"
                : "10px",
              background:
                "linear-gradient(160deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)",
              borderRadius: 26,
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingBottom: 24,
              boxSizing: "border-box",
              overflow: "hidden",
              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* DECORATIVE CIRCLE */}
            <div
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                top: -90,
                right: -80,
                background:
                  "rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                bottom: 10,
                left: -75,
                background:
                  "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          LOGOUT CONFIRMATION
      ───────────────────────────────────────────────────────────────────── */}

      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.5)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: "28px 22px 22px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            {/* ICON */}
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "rgba(23,107,58,0.10)",
                border:
                  `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,
                  color: PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontWeight: 700,
                fontSize: 18,
                color: PALETTE.textDark,
                lineHeight: 1.35,
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: 240,
                fontWeight: 400,
                fontSize: 11,
                lineHeight: "16px",
                color: PALETTE.textMuted,
              }}
            >
              You will need to login again
              <br />
              to access your account.
            </p>

            {/* BUTTONS */}
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #DADADA",
                  borderRadius: 14,
                  background: "#F5F5F5",
                  color: PALETTE.textDark,
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 14,
                  background: `linear-gradient(
                    135deg,
                    ${PALETTE.greenDark},
                    ${PALETTE.greenLight}
                  )`,
                  color: "#FFFFFF",
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 22px rgba(21,91,50,0.28)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          LOGOUT LOADING
      ───────────────────────────────────────────────────────────────────── */}

      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "30px 22px 24px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "rgba(23,107,58,0.08)",
                border:
                  `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />

            <h2
              style={{
                margin: "0 0 7px",
                fontWeight: 700,
                fontSize: 17,
                color: PALETTE.textDark,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin: "0 0 19px",
                fontWeight: 400,
                fontSize: 11,
                color: PALETTE.textMuted,
              }}
            >
              Please wait...
            </p>

            {/* PROGRESS BAR */}
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 8,
                overflow: "hidden",
                background: "#EDEDED",
                border: "1px solid #DADADA",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  borderRadius: 8,
                  background: `linear-gradient(
                    90deg,
                    ${PALETTE.greenDark},
                    ${PALETTE.greenLight}
                  )`,
                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          TOP BAR
      ───────────────────────────────────────────────────────────────────── */}

      <div
        style={{
          paddingTop: SAFE_TOP,
          paddingLeft: isDesktop ? 40 : 20,
          paddingRight: isDesktop ? 40 : 20,
          paddingBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isDesktop ? 18 : 12,
          animation:
            "scanityFadeUp 0.5s ease-out both",
          flexShrink: 0,
        }}
      >
        {/* HAMBURGER */}
        <button
          type="button"
          className="scanity-hamburger"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          style={{
            width: 42,
            height: 42,
            background: PALETTE.cardWhite,
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 20,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />

            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />

            <span
              style={{
                display: "block",
                width: 20,
                height: 2.5,
                borderRadius: 5,
                background: PALETTE.textDark,
              }}
            />
          </div>
        </button>

        {/* TITLE */}
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: FONT,
              fontSize: isDesktop ? 24 : 19,
              fontWeight: 800,
              color: PALETTE.textDark,
              letterSpacing: "-0.02em",
            }}
          >
            {privacy
              ? "Privacy Policy"
              : "Terms of Service"}
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: PALETTE.greenText,
              fontWeight: 500,
            }}
          >
            {privacy
              ? "Your information and choices"
              : "Using Scanity responsibly"}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          SCROLLABLE BODY
      ───────────────────────────────────────────────────────────────────── */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
            padding: isDesktop
              ? "8px 40px 40px"
              : "4px 16px 30px",
            boxSizing: "border-box",
          }}
        >
          {/* INTRO CARD */}
          <div
            className="scanity-legal-card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: isDesktop
                ? "26px 26px"
                : "22px 20px",
              marginBottom: 22,
              borderRadius: 22,
              background: `linear-gradient(
                145deg,
                ${PALETTE.greenDark} 0%,
                ${PALETTE.green} 45%,
                ${PALETTE.greenLight} 100%
              )`,
              boxShadow:
                "0 12px 30px rgba(21,91,50,0.20)",
              animation:
                "scanityCardIn 0.5s ease-out 0.05s both",
            }}
          >
            {/* DECORATIVE CIRCLE */}
            <div
              style={{
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: "50%",
                right: -55,
                top: -70,
                background:
                  "rgba(255,255,255,0.08)",
              }}
            />

            <p
              style={{
                position: "relative",
                margin: "2px 2px 6px",
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                paddingBottom: 15,
              }}
            >
              {privacy
                ? "Your privacy matters"
                : "A few important notes"}
            </p>

            <p
              style={{
                position: "relative",
                margin: 0,
                maxWidth: 620,
                color:
                  "rgba(255,255,255,0.84)",
                fontSize: 11,
                lineHeight: 1.65,
              }}
            >
              {privacy
                ? "Here is how Scanity uses information to personalize your experience."
                : "Please read these guidelines before using Scanity."}
            </p>
          </div>

          {/* SECTION HEADER */}
          <div
            style={{
              marginBottom: 12,
              padding: "0 3px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: PALETTE.textDark,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              {privacy
                ? "Policy details"
                : "Terms details"}
            </p>

            <p
              style={{
                margin: "4px 0 0",
                color: PALETTE.textMuted,
                fontSize: 10,
              }}
            >
              {privacy
                ? "Tap a section to view more information."
                : "Tap a section to view the details."}
            </p>
          </div>

          {/* LEGAL SECTIONS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {sections.map(([title, text], index) => {
              const isOpen = openSection === index

              return (
                <section
                  key={title}
                  className="scanity-legal-card"
                  style={{
                    borderRadius: 18,
                    border: isOpen
                      ? `1px solid ${PALETTE.greenLight}`
                      : `1px solid ${PALETTE.border}`,
                    background:
                      PALETTE.cardWhite,
                    boxShadow: isOpen
                      ? "0 10px 26px rgba(21,91,50,0.14)"
                      : "0 5px 15px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                    animation: `scanityCardIn 0.4s ease-out ${
                      0.10 + index * 0.06
                    }s both`,
                  }}
                >
                  {/* CLICKABLE TITLE */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSection(
                        isOpen ? null : index
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      gap: 13,
                      padding: isDesktop
                        ? "17px 18px"
                        : "15px",
                      border: "none",
                      background: "transparent",
                      color: PALETTE.textDark,
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {/* TITLE */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            PALETTE.textDark,
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.4,
                        }}
                      >
                        {title}
                      </p>
                    </div>

                    {/* PLUS / MINUS */}
                    <div
                      className="scanity-legal-toggle"
                      style={{
                        flexShrink: 0,
                        width: 27,
                        height: 27,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isOpen
                          ? "rgba(23,107,58,0.12)"
                          : "#F5F5F0",
                      }}
                    >
                      <i
                        className={`fa ${
                          isOpen
                            ? "fa-minus"
                            : "fa-plus"
                        }`}
                        style={{
                          color:
                            PALETTE.greenText,
                          fontSize: 11,
                        }}
                      />
                    </div>
                  </button>

                  {/* ANSWER */}
                  {isOpen && (
                    <div
                      style={{
                        padding: isDesktop
                          ? "0 18px 18px"
                          : "0 15px 16px",
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          marginBottom: 13,
                          background:
                            PALETTE.border,
                        }}
                      />

                      <p
                        style={{
                          margin: 0,
                          color:
                            PALETTE.textMuted,
                          fontSize: 10,
                          lineHeight: 1.7,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Settings Screen ───────────────────────────────────────────────────────────

function SettingsScreen({
  go,
}: {
  go: (s: Screen) => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false)
  const [showLogoutLoading, setShowLogoutLoading] =
    useState(false)

  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  // ──────────────────────────────────────────────────────────────────────────
  // COLORS
  // ──────────────────────────────────────────────────────────────────────────

  const COLORS = {
    page: "#F2F1EC",

    greenDark: "#155B32",
    green: "#176B3A",
    greenMid: "#23804B",
    greenLight: "#2E8B57",

    white: "#FFFFFF",
    black: "#171717",
    gray: "#666666",
    lightGray: "#D9D9D9",
    cardGray: "#D8D8D8",

    danger: "#D94A4A",
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR ITEMS
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SIDEBAR MENU (matches Dashboard)
  // ──────────────────────────────────────────────────────────────────────────

  const sidebarMenu = (
    <>
      {/* LOGO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,

          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            color: "#FFFFFF",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.textOnDark }}>Scan</span>
          <span style={{ color: C.greenLight }}>ity</span>
        </span>
      </div>

      {/* MENU TITLE */}

      <p
        style={{
          margin: 0,

          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",

          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",

          color:
            "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* MENU */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,

          padding: isDesktop
            ? "0 10px"
            : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,

              padding: isDesktop
                ? "12px 14px"
                : "11px 12px",

              background:
                "transparent",

              border: "none",
              borderRadius: 14,

              cursor: "pointer",

              width: "100%",

              textAlign: "left",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,

                fontSize:
                  isDesktop ? 13 : 12,

                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* LOGOUT */}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() =>
            setShowLogoutConfirm(true)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,

            padding: isDesktop
              ? "12px 14px"
              : "11px 12px",

            background:
              "transparent",

            border: "none",
            borderRadius: 14,

            cursor: "pointer",

            width: "100%",

            textAlign: "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              textAlign: "center",

              color: "#FFFFFF",

              transform:
                "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,

              fontSize:
                isDesktop ? 13 : 12,

              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // SETTINGS ROW
  // ──────────────────────────────────────────────────────────────────────────

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onClick,
    danger = false,
  }: {
    icon: string
    title: string
    subtitle?: string
    onClick?: () => void
    danger?: boolean
  }) => {
    return (
      <button
        type="button"

        onClick={onClick}

        style={{
          width: "100%",

          minHeight:
            isDesktop ? 92 : 72,

          display: "flex",

          alignItems: "center",

          gap:
            isDesktop ? 22 : 16,

          padding:
            isDesktop
              ? "20px 26px"
              : "14px 16px",

          background:
            COLORS.white,

          border: "none",

          borderRadius: 20,

          cursor:
            onClick
              ? "pointer"
              : "default",

          boxSizing:
            "border-box",

          textAlign: "left",

          boxShadow:
            "0 5px 0 rgba(0,0,0,0.12)",

          transition:
            "transform 0.16s ease, box-shadow 0.16s ease",
        }}
      >
        {/* ICON */}

        <div
          style={{
            width:
              isDesktop ? 56 : 46,

            height:
              isDesktop ? 56 : 46,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            flexShrink: 0,

            borderRadius:
              isDesktop ? 16 : 13,

            background:
              danger
                ? "rgba(217,74,74,0.12)"
                : "rgba(23,107,58,0.12)",

            color:
              danger
                ? COLORS.danger
                : COLORS.green,
          }}
        >
          <i
            className={`fa ${icon}`}
            style={{
              fontSize:
                isDesktop ? 24 : 19,
            }}
          />
        </div>

        {/* TEXT */}

        <div
          style={{
            flex: 1,

            minWidth: 0,
          }}
        >
          <p
            style={{
              margin: 0,

              fontFamily: FONT,

              fontWeight: 700,

              fontSize:
                isDesktop ? 16 : 12,

              color:
                danger
                  ? COLORS.danger
                  : COLORS.black,
            }}
          >
            {title}
          </p>

          {subtitle && (
            <p
              style={{
                margin:
                  "2px 0 0",

                fontFamily: FONT,

                fontWeight: 400,

                fontSize:
                  isDesktop ? 12 : 9,

                color:
                  COLORS.gray,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* CHEVRON */}

        <i
          className="fa fa-angle-right"
          style={{
            fontSize:
              isDesktop ? 24 : 20,

            color:
              danger
                ? "rgba(217,74,74,0.65)"
                : "#888888",

            flexShrink: 0,
          }}
        />
      </button>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION TITLE
  // ──────────────────────────────────────────────────────────────────────────

  const SectionTitle = ({
    children,
  }: {
    children: ReactNode
  }) => (
    <p
      style={{
        margin:
          isDesktop
            ? "0 0 14px 6px"
            : "0 0 10px 4px",

        fontFamily: FONT,

        fontWeight: 700,

        fontSize:
          isDesktop ? 12 : 10,

        color: COLORS.black,

        textTransform:
          "uppercase",

        letterSpacing:
          "0.04em",
      }}
    >
      {children}
    </p>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,

        height: "100vh",

        minHeight: 0,

        display: "flex",

        flexDirection: "column",

        position: "relative",

        overflow: "hidden",

        background:
          COLORS.page,

        fontFamily: FONT,
      }}
    >
      {/* ═════════════════════════════════════════════════════════════════════
          ANIMATIONS
      ═════════════════════════════════════════════════════════════════════ */}

      <style>
        {`
          @keyframes settingsLogoutProgress {
            from {
              width: 0%;
            }

            to {
              width: 100%;
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanityBackdropIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background:
              rgba(255,255,255,0.10) !important;

            transform:
              translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform: scale(0.97);
          }

          .scanity-hamburger {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-hamburger:hover {
            transform:
              translateY(-2px);

            box-shadow:
              0 8px 20px
              rgba(0,0,0,0.08) !important;
          }

          .scanity-hamburger:active {
            transform:
              scale(0.94);
          }

          .scanity-profile {
            transition:
              transform 0.15s ease,
              opacity 0.15s ease;
          }

          .scanity-profile:hover {
            transform:
              translateY(-1px);

            opacity: 0.8;
          }

          button:hover {
            outline: none;
          }
        `}
      </style>

      {/* ═════════════════════════════════════════════════════════════════════
          SIDEBAR (overlay — matches Dashboard)
      ═════════════════════════════════════════════════════════════════════ */}

      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            zIndex: 50,

            display: "flex",
          }}
        >
          {/* BACKDROP */}

          <div
            onClick={() =>
              setSidebarOpen(false)
            }
            style={{
              position: "absolute",
              inset: 0,

              background:
                "rgba(0,0,0,0.40)",

              backdropFilter:
                "blur(4px)",

              WebkitBackdropFilter:
                "blur(4px)",

              animation:
                "scanityBackdropIn 0.2s ease-out both",
            }}
          />

          {/* SIDEBAR */}

          <div
            style={{
              position: "relative",

              zIndex: 51,

              width:
                isDesktop ? 245 : 220,

              height:
                `calc(100% - ${
                  isDesktop ? 32 : 20
                }px)`,

              margin:
                isDesktop
                  ? "16px"
                  : "10px",

              // GRADIENT SIDEBAR
              background:
                `linear-gradient(
                  160deg,
                  #155B32 0%,
                  #176B3A 45%,
                  #2E8B57 100%
                )`,

              borderRadius: 26,

              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",

              display: "flex",
              flexDirection: "column",

              paddingTop: SAFE_TOP,
              paddingBottom: 24,

              boxSizing:
                "border-box",

              overflow: "hidden",

              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* DECORATIVE CIRCLE */}

            <div
              style={{
                position: "absolute",

                width: 160,
                height: 160,

                borderRadius: "50%",

                top: -90,
                right: -80,

                background:
                  "rgba(255,255,255,0.06)",

                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",

                width: 120,
                height: 120,

                borderRadius: "50%",

                bottom: 10,
                left: -75,

                background:
                  "rgba(255,255,255,0.04)",

                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═════════════════════════════════════════════════════════════════════ */}

      <div
        style={{
          flex: 1,

          minWidth: 0,

          minHeight: 0,

          display: "flex",

          flexDirection: "column",

          overflow: "hidden",

          position: "relative",

          zIndex: 1,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}

        <div
          style={{
            display: "flex",

            alignItems: "center",

            justifyContent:
              "space-between",

            paddingTop:
              isDesktop
                ? 27
                : SAFE_TOP + 10,

            paddingLeft:
              isDesktop ? 20 : 18,

            paddingRight:
              isDesktop ? 30 : 18,

            paddingBottom:
              isDesktop ? 12 : 10,

            flexShrink: 0,
          }}
        >
          {/* HAMBURGER — always visible, matches Dashboard */}

          <button
            type="button"

            className="scanity-hamburger"

            aria-label="Open navigation"

            onClick={() =>
              setSidebarOpen(true)
            }

            style={{
              width: 40,

              height: 40,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              borderRadius: 13,

              border:
                "1px solid #DADAD5",

              background:
                COLORS.white,

              cursor: "pointer",

              marginRight: 12,

              boxShadow:
                "0 6px 16px rgba(0,0,0,0.05)",

              flexShrink: 0,

              padding: 0,
            }}
          >
            <i
              className="fa fa-bars"
              style={{
                fontSize: 19,

                color:
                  COLORS.black,
              }}
            />
          </button>

          {/* TITLE */}

          <div
            style={{
              flex: 1,
            }}
          >
            <h2
              style={{
                margin: 0,

                fontFamily: FONT,

                fontWeight: 700,

                fontSize:
                  isDesktop ? 22 : 19,

                color:
                  COLORS.black,

                letterSpacing:
                  "-0.02em",

                lineHeight: 1.1,
              }}
            >
              Settings
            </h2>

            <p
              style={{
                margin:
                  "3px 0 0",

                fontFamily: FONT,

                fontWeight: 400,

                fontSize:
                  isDesktop ? 9 : 8,

                color:
                  COLORS.black,
              }}
            >
              Customize your Scanity experience
            </p>
          </div>

          {/* USER */}

          <button
            type="button"

            className="scanity-profile"

            onClick={() =>
              go("profile")
            }

            style={{
              display: "flex",

              alignItems: "center",

              gap: 9,

              border: "none",

              background:
                "transparent",

              cursor: "pointer",

              padding: 0,
            }}
          >
            <div
              style={{
                width:
                  isDesktop ? 32 : 30,

                height:
                  isDesktop ? 32 : 30,

                borderRadius:
                  "50%",

                border:
                  "1px solid #CCCCCC",

                background:
                  COLORS.white,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-user"
                style={{
                  fontSize:
                    isDesktop ? 14 : 13,

                  color:
                    COLORS.black,
                }}
              />
            </div>

            {isDesktop && (
              <span
                style={{
                  fontFamily: FONT,

                  fontWeight: 600,

                  fontSize: 11,

                  color:
                    COLORS.black,
                }}
              >
                Username
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTENT
        ═══════════════════════════════════════════════════════════════════ */}

        <div
          style={{
            flex: 1,

            minHeight: 0,

            overflowY: "auto",

            display: "flex",

            justifyContent: "center",

            padding:
              isDesktop
                ? "24px 40px 60px"
                : "10px 16px 30px",

            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              width: "100%",

              maxWidth:
                isDesktop ? 780 : 620,

              display: "flex",

              flexDirection: "column",

              gap:
                isDesktop ? 30 : 22,
            }}
          >
            {/* ═════════════════════════════════════════════════════════════
                SUPPORT & INFO
            ═════════════════════════════════════════════════════════════ */}

            <div>
              <SectionTitle>
                Support & Info
              </SectionTitle>

              <div
                style={{
                  display: "flex",

                  flexDirection:
                    "column",

                  gap:
                    isDesktop ? 14 : 10,
                }}
              >
                {/* ABOUT */}

                <SettingRow
                  icon="fa-info-circle"
                  title="About Scanity"
                  subtitle="Learn more about Scanity"
                  onClick={() =>
                    go("about")
                  }
                />

                {/* PRIVACY */}

                <SettingRow
                  icon="fa-shield"
                  title="Privacy Policy"
                  onClick={() =>
                    go("privacy")
                  }
                />

                {/* TERMS */}

                <SettingRow
                  icon="fa-file-text-o"
                  title="Terms of Service"
                  onClick={() =>
                    go("terms")
                  }
                />
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                SECURITY
            ═════════════════════════════════════════════════════════════ */}

            <div>
              <SectionTitle>
                Security
              </SectionTitle>

              <div
                style={{
                  display: "flex",

                  flexDirection:
                    "column",

                  gap:
                    isDesktop ? 14 : 10,
                }}
              >
                {/* CHANGE PASSWORD */}

                <SettingRow
                  icon="fa-lock"
                  title="Change Password"
                  subtitle="Update your current password"
                  onClick={() =>
                    go("forgotPassword")
                  }
                />
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                ACCOUNT
            ═════════════════════════════════════════════════════════════ */}

            <div>
              <SectionTitle>
                Account
              </SectionTitle>

              <div
                style={{
                  display: "flex",

                  flexDirection:
                    "column",

                  gap:
                    isDesktop ? 14 : 10,
                }}
              >
                {/* DELETE ACCOUNT */}

                <SettingRow
                  icon="fa-trash-o"
                  title="Delete Account"
                  subtitle="Permanently delete your account"
                  danger
                  onClick={() =>
                    go("delete")
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          LOGOUT CONFIRMATION
      ═════════════════════════════════════════════════════════════════════ */}

      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",

            inset: 0,

            zIndex: 100,

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            padding: 20,

            background:
              "rgba(0,0,0,0.48)",

            backdropFilter:
              "blur(7px)",

            WebkitBackdropFilter:
              "blur(7px)",
          }}
        >
          <div
            style={{
              width: "100%",

              maxWidth: 320,

              padding:
                "28px 23px 22px",

              borderRadius: 25,

              background:
                COLORS.white,

              boxShadow:
                "0 25px 60px rgba(0,0,0,0.25)",

              textAlign: "center",

              boxSizing:
                "border-box",
            }}
          >
            {/* ICON */}

            <div
              style={{
                width: 65,

                height: 65,

                margin:
                  "0 auto 15px",

                borderRadius:
                  "50%",

                background:
                  "#E8F3EC",

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 28,

                  color:
                    COLORS.green,
                }}
              />
            </div>

            <h3
              style={{
                margin:
                  "0 0 7px",

                fontFamily: FONT,

                fontWeight: 700,

                fontSize: 17,

                color:
                  COLORS.black,
              }}
            >
              Are you sure you want to logout?
            </h3>

            <p
              style={{
                margin:
                  "0 0 20px",

                fontFamily: FONT,

                fontSize: 10,

                lineHeight: 1.5,

                color:
                  COLORS.gray,
              }}
            >
              You will need to login again
              <br />
              to access your account.
            </p>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",

                gap: 10,
              }}
            >
              <button
                type="button"

                onClick={() =>
                  setShowLogoutConfirm(false)
                }

                style={{
                  flex: 1,

                  height: 43,

                  border:
                    "1px solid #D5D5D5",

                  borderRadius: 13,

                  background:
                    "#F5F5F5",

                  color:
                    COLORS.black,

                  fontFamily: FONT,

                  fontWeight: 500,

                  fontSize: 11,

                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"

                onClick={handleLogout}

                style={{
                  flex: 1,

                  height: 43,

                  border: "none",

                  borderRadius: 13,

                  background: `
                    linear-gradient(
                      135deg,
                      ${COLORS.greenDark},
                      ${COLORS.greenLight}
                    )
                  `,

                  color:
                    COLORS.white,

                  fontFamily: FONT,

                  fontWeight: 600,

                  fontSize: 11,

                  cursor: "pointer",

                  boxShadow:
                    "0 7px 18px rgba(21,91,50,0.25)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LOGOUT LOADING
      ═════════════════════════════════════════════════════════════════════ */}

      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",

            inset: 0,

            zIndex: 110,

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            padding: 20,

            background:
              "rgba(0,0,0,0.52)",

            backdropFilter:
              "blur(8px)",

            WebkitBackdropFilter:
              "blur(8px)",
          }}
        >
          <div
            style={{
              width: "100%",

              maxWidth: 300,

              padding:
                "30px 22px 24px",

              borderRadius: 25,

              background:
                COLORS.white,

              textAlign: "center",

              boxShadow:
                "0 25px 60px rgba(0,0,0,0.25)",

              boxSizing:
                "border-box",
            }}
          >
            <div
              style={{
                width: 65,

                height: 65,

                margin:
                  "0 auto 15px",

                borderRadius:
                  "50%",

                background:
                  "#E8F3EC",

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 28,

                  color:
                    COLORS.green,
                }}
              />
            </div>

            <h3
              style={{
                margin:
                  "0 0 6px",

                fontFamily: FONT,

                fontWeight: 700,

                fontSize: 17,

                color:
                  COLORS.black,
              }}
            >
              Logging Out
            </h3>

            <p
              style={{
                margin:
                  "0 0 18px",

                fontFamily: FONT,

                fontSize: 10,

                color:
                  COLORS.gray,
              }}
            >
              Please wait...
            </p>

            {/* PROGRESS BAR */}

            <div
              style={{
                width: "100%",

                height: 7,

                borderRadius: 7,

                overflow: "hidden",

                background:
                  "#E5E5E5",
              }}
            >
              <div
                style={{
                  width: "0%",

                  height: "100%",

                  borderRadius: 7,

                  background: `
                    linear-gradient(
                      90deg,
                      ${COLORS.greenDark},
                      ${COLORS.greenLight}
                    )
                  `,

                  animation:
                    "settingsLogoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )}


// ── Delete Account Screen ────────────────────────────────────────────────────
function DeleteAccountScreen({ go }: { go: (s: Screen) => void }) {
  const [showDeleteLoading, setShowDeleteLoading] = useState(false)
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#061A0F",
      }}
    >
      {/* ═══════════════════════════════════════════
          BACKGROUND IMAGE
      ═══════════════════════════════════════════ */}
      <img
        src="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.24,
          pointerEvents: "none",
        }}
      />
      {/* ═══════════════════════════════════════════
          DARK GREEN OVERLAY
      ═══════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4,24,13,0.88) 0%, rgba(5,39,20,0.88) 50%, rgba(3,22,12,0.96) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* ═══════════════════════════════════════════
          BACK BUTTON
      ═══════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => go("settings")}
        style={{
          position: "absolute",
          top: SAFE_TOP,
          left: 18,
          zIndex: 5,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 11,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(8,35,19,0.75)",
          color: C.textOnDark,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}
      >
        <i
          className="fa fa-angle-left"
          style={{
            fontSize: 21,
          }}
        />
      </button>
      {/* ═══════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 22,
          boxSizing: "border-box",
        }}
      >
        {/* ═══════════════════════════════════════════
            DELETE CARD
        ═══════════════════════════════════════════ */}
        <div
          style={{
            width: "100%",
            maxWidth: 330,
            padding: "30px 22px 22px",
            borderRadius: 24,
            background: "rgba(14,62,32,0.90)",
            border: "1px solid rgba(224,167,46,0.35)",
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.42), inset 0 1px 1px rgba(255,255,255,0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {/* ═══════════════════════════════════════════
              TRASH ICON
          ═══════════════════════════════════════════ */}
          <div
            style={{
              width: 78,
              height: 78,
              margin: "0 auto 17px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(224,167,46,0.12)",
              border: "2px solid rgba(224,167,46,0.42)",
              boxShadow: "0 0 20px rgba(224,167,46,0.08)",
            }}
          >
            <i
              className="fa fa-trash-o"
              style={{
                fontSize: 35,
                color: C.greenLight,
              }}
            />
          </div>
          {/* ═══════════════════════════════════════════
              TITLE
          ═══════════════════════════════════════════ */}
          <h2
            style={{
              margin: "0 0 8px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: C.textOnDark,
            }}
          >
            Delete your account?
          </h2>
          {/* ═══════════════════════════════════════════
              DESCRIPTION
          ═══════════════════════════════════════════ */}
          <p
            style={{
              margin: "0 auto 19px",
              maxWidth: 255,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              lineHeight: "15px",
              color: "rgba(255,255,255,0.58)",
            }}
          >
            This action cannot be undone. All your data, scan history, and
            preferences will be permanently deleted.
          </p>
          {/* ═══════════════════════════════════════════
              WARNING
          ═══════════════════════════════════════════ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "11px 12px",
              marginBottom: 20,
              boxSizing: "border-box",
              borderRadius: 12,
              background: "rgba(245,197,24,0.10)",
              border: "1px solid rgba(245,197,24,0.20)",
              textAlign: "left",
            }}
          >
            <i
              className="fa fa-exclamation-triangle"
              style={{
                fontSize: 13,
                color: "#F5C518",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 9,
                lineHeight: "13px",
                color: "rgba(255,255,255,0.68)",
              }}
            >
              This action cannot be undone.
            </span>
          </div>
          {/* ═══════════════════════════════════════════
              DELETE BUTTON
          ═══════════════════════════════════════════ */}
          <button
            type="button"
            onClick={() => {
              setShowDeleteLoading(true)
              setTimeout(() => {
                setShowDeleteLoading(false)
                go("splash")
              }, 1800)
            }}
            style={{
              width: "100%",
              height: 43,
              marginBottom: 9,
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #D9534F, #B93E3A)",
              color: "#FFFFFF",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              cursor: "pointer",
              boxShadow: "0 5px 16px rgba(217,83,79,0.24)",
            }}
          >
            Yes, Delete My Account
          </button>
          {/* ═══════════════════════════════════════════
              CANCEL BUTTON
          ═══════════════════════════════════════════ */}
          <button
            type="button"
            onClick={() => go("settings")}
            style={{
              width: "100%",
              height: 43,
              border: "1px solid rgba(224,167,46,0.28)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              color: C.textOnDark,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      {/* ═══════════════════════════════════════════
          DELETE LOADING
      ═══════════════════════════════════════════ */}
      {showDeleteLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(3,18,10,0.78)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "30px 22px 24px",
              borderRadius: 24,
              background: "rgba(14,62,32,0.95)",
              border: "1px solid rgba(224,167,46,0.30)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.50)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {/* Loading Circle */}
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "2px solid rgba(224,167,46,0.35)",
                background: "rgba(224,167,46,0.08)",
              }}
            >
              <i
                className="fa fa-trash-o"
                style={{
                  fontSize: 29,
                  color: C.greenLight,
                }}
              />
            </div>
            {/* Loading Title */}
            <h2
              style={{
                margin: "0 0 7px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: C.textOnDark,
              }}
            >
              Deleting Account
            </h2>
            {/* Loading Text */}
            <p
              style={{
                margin: "0 0 19px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: 9,
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Please wait...
            </p>
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 8,
                overflow: "hidden",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  borderRadius: 8,
                  background: C.greenLight,
                  animation: "deleteProgress 1.8s linear forwards",
                }}
              />
            </div>
            {/* Bottom Text */}
            <p
              style={{
                margin: "11px 0 0",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                fontSize: 8,
                color: "rgba(255,255,255,0.60)",
              }}
            >
              Please wait a moment.
            </p>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════
          PROGRESS ANIMATION
      ═══════════════════════════════════════════ */}
      <style>
        {`
          @keyframes deleteProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}
      </style>
    </div>
  )
}
// ── Forgot Password ─────────────────────────────────────────────────────────
function ForgotPasswordScreen({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)

  const isDesktop = useIsDesktop()

  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#e8e5e0",
    sidebarBg: "#176B3A",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",
    cardWhite: "#FFFFFF",
    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E3DC",
  }

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  const sidebarMenu = (
    <>
      {/* LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Scan</span>
          <span style={{ color: "#9CE6B8" }}>ity</span>
        </span>
      </div>

      {/* MENU TITLE */}
      <p
        style={{
          margin: 0,
          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      {/* MENU ITEMS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: isDesktop ? "0 10px" : "0 9px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isDesktop
                ? "12px 14px"
                : "11px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              boxSizing: "border-box",
            }}
          >
            <i
              className={`fa ${item.icon}`}
              style={{
                fontSize: 15,
                width: 19,
                minWidth: 19,
                textAlign: "center",
                color: "#FFFFFF",
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: isDesktop ? 13 : 12,
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* LOGOUT */}
        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isDesktop
              ? "12px 14px"
              : "11px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            boxSizing: "border-box",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              width: 19,
              minWidth: 19,
              textAlign: "center",
              color: "#FFFFFF",
              transform: "scaleX(-1)",
            }}
          />

          <span
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: isDesktop ? 13 : 12,
              color: "#FFFFFF",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: PALETTE.pageBg,
        fontFamily: FONT,
      }}
    >
      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes scanityFadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes scanityBackdropIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes scanityCardIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes logoutProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }

          .scanity-sidebar-item:active {
            transform: scale(0.97);
          }

          .scanity-auth-card {
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-auth-card:hover {
            transform: translateY(-2px);
            box-shadow:
              0 12px 28px rgba(0,0,0,0.08) !important;
          }

          .scanity-auth-button {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-auth-button:hover {
            transform: translateY(-1px);
            box-shadow:
              0 10px 24px rgba(21,91,50,0.22) !important;
          }

          .scanity-back-button {
            transition:
              background 0.15s ease,
              transform 0.15s ease;
          }

          .scanity-back-button:hover {
            background: #F2F4EF !important;
            transform: translateX(-2px);
          }

          .scanity-input {
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-input:focus-within {
            border-color: #2E8B57 !important;
            box-shadow:
              0 0 0 3px rgba(46,139,87,0.10);
          }
        `}
      </style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation:
                "scanityBackdropIn 0.2s ease-out both",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop ? "16px" : "10px",
              background:
                "linear-gradient(160deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)",
              borderRadius: 26,
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingBottom: 24,
              boxSizing: "border-box",
              overflow: "hidden",
              animation:
                "scanitySidebarSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                top: -90,
                right: -80,
                background:
                  "rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                bottom: 10,
                left: -75,
                background:
                  "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />

            {sidebarMenu}
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.5)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: "28px 22px 22px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "rgba(23,107,58,0.10)",
                border:
                  `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,
                  color: PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontWeight: 700,
                fontSize: 18,
                color: PALETTE.textDark,
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: 240,
                fontWeight: 400,
                fontSize: 11,
                lineHeight: "16px",
                color: PALETTE.textMuted,
              }}
            >
              You will need to login again
              <br />
              to access your account.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #DADADA",
                  borderRadius: 14,
                  background: "#F5F5F5",
                  color: PALETTE.textDark,
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, #155B32, #2E8B57)",
                  color: "#FFFFFF",
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 22px rgba(21,91,50,0.28)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "30px 22px 24px",
              borderRadius: 28,
              background: PALETTE.cardWhite,
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
              textAlign: "center",
              boxSizing: "border-box",
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "rgba(23,107,58,0.08)",
                border:
                  `2px solid ${PALETTE.green}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 28,
                  color: PALETTE.green,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 7px",
                fontWeight: 700,
                fontSize: 17,
                color: PALETTE.textDark,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin: "0 0 19px",
                fontWeight: 400,
                fontSize: 11,
                color: PALETTE.textMuted,
              }}
            >
              Please wait...
            </p>

            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 8,
                overflow: "hidden",
                background: "#EDEDED",
                border: "1px solid #DADADA",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  borderRadius: 8,
                  background:
                    "linear-gradient(90deg, #155B32, #2E8B57)",
                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div
        style={{
          paddingTop: SAFE_TOP,
          paddingLeft: isDesktop ? 40 : 18,
          paddingRight: isDesktop ? 40 : 18,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isDesktop ? 18 : 10,
          animation:
            "scanityFadeUp 0.5s ease-out both",
          flexShrink: 0,
        }}
      >
        {/* BACK */}
        <button
          type="button"
          className="scanity-back-button"
          onClick={() => go("login")}
          style={{
            width: 42,
            height: 42,
            background: PALETTE.cardWhite,
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
            padding: 0,
          }}
        >
          <i
            className="fa fa-angle-left"
            style={{
              fontSize: 24,
              color: PALETTE.textDark,
            }}
          />
        </button>

        {/* TITLE */}
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: FONT,
              fontSize: isDesktop ? 24 : 19,
              fontWeight: 800,
              color: PALETTE.textDark,
              letterSpacing: "-0.02em",
            }}
          >
            Forgot Password
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: PALETTE.greenText,
              fontWeight: 500,
            }}
          >
            Recover access to your account
          </p>
        </div>

        {/* SPACER + MENU */}
        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 42,
              height: 42,
              background: PALETTE.cardWhite,
              border: "1px solid #E0E0E0",
              borderRadius: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 6px 16px rgba(0,0,0,0.05)",
            }}
          >
            <i
              className="fa fa-bars"
              style={{
                fontSize: 17,
                color: PALETTE.textDark,
              }}
            />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: isDesktop
              ? "20px 40px 40px"
              : "12px 16px 30px",
            boxSizing: "border-box",
          }}
        >
          {/* INTRO CARD */}
          <div
            className="scanity-auth-card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: isDesktop
                ? "28px 28px"
                : "22px 20px",
              marginBottom: 18,
              borderRadius: 22,
              background:
                "linear-gradient(145deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)",
              boxShadow:
                "0 12px 30px rgba(21,91,50,0.20)",
              animation:
                "scanityCardIn 0.5s ease-out 0.05s both",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: "50%",
                right: -55,
                top: -70,
                background:
                  "rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                background:
                  "rgba(255,255,255,0.13)",
                marginBottom: 15,
              }}
            >
            </div>

            <p
              style={{
                position: "relative",
                margin: "0 0 6px",
                color: "#FFFFFF",
                fontSize: isDesktop ? 20 : 18,
                fontWeight: 800,
              }}
            >
              Let's get you back in
            </p>

            <p
              style={{
                position: "relative",
                margin: 0,
                maxWidth: 540,
                color: "rgba(255,255,255,0.84)",
                fontSize: 11,
                lineHeight: 1.65,
              }}
            >
              Enter the email address connected to
              your Scanity account and continue to
              reset your password.
            </p>
          </div>

          {/* FORM CARD */}
          <div
            className="scanity-auth-card"
            style={{
              background: PALETTE.cardWhite,
              border:
                `1px solid ${PALETTE.border}`,
              borderRadius: 22,
              padding: isDesktop
                ? "28px"
                : "22px 18px",
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.05)",
              animation:
                "scanityCardIn 0.45s ease-out 0.12s both",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  background:
                    "rgba(23,107,58,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className="fa fa-envelope-o"
                  style={{
                    color: PALETTE.green,
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: PALETTE.textDark,
                  }}
                >
                  Account Email
                </p>

                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 9,
                    color: PALETTE.textMuted,
                  }}
                >
                  We'll use this to continue the reset.
                </p>
              </div>
            </div>

            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: 11,
                fontWeight: 600,
                color: PALETTE.textDark,
              }}
            >
              Email Address
            </label>

            <div
              className="scanity-input"
              style={{
                width: "100%",
                height: isDesktop ? 52 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 15px",
                boxSizing: "border-box",
                borderRadius: 14,
                background: "#F8F8F5",
                border:
                  email
                    ? `1px solid ${PALETTE.greenLight}`
                    : "1px solid #E2E1DB",
              }}
            >
              <i
                className="fa fa-envelope-o"
                style={{
                  fontSize: 15,
                  color: PALETTE.green,
                  flexShrink: 0,
                }}
              />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: PALETTE.textDark,
                  fontFamily: FONT,
                  fontSize: isDesktop ? 12 : 11,
                }}
              />
            </div>

            <button
              type="button"
              disabled={!email.trim()}
              className="scanity-auth-button"
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              onMouseLeave={() => setPressed(false)}
              onTouchStart={() => setPressed(true)}
              onTouchEnd={() => setPressed(false)}
              onClick={() => {
                if (email.trim()) {
                  go("resetPassword")
                }
              }}
              style={{
                width: "100%",
                height: isDesktop ? 52 : 48,
                marginTop: 18,
                border: "none",
                borderRadius: 14,
                background: !email.trim()
                  ? "#D8D8D3"
                  : pressed
                    ? PALETTE.greenDark
                    : "linear-gradient(135deg, #155B32, #2E8B57)",
                color: "#FFFFFF",
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                cursor: !email.trim()
                  ? "not-allowed"
                  : "pointer",
                boxShadow: !email.trim()
                  ? "none"
                  : "0 7px 20px rgba(21,91,50,0.20)",
                transform: pressed
                  ? "scale(0.98)"
                  : "scale(1)",
              }}
            >
              Continue
              <i
                className="fa fa-arrow-right"
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => go("login")}
              style={{
                width: "100%",
                marginTop: 16,
                border: "none",
                background: "transparent",
                color: PALETTE.textMuted,
                fontFamily: FONT,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Remember your password?{" "}
              <span
                style={{
                  color: PALETTE.greenText,
                  fontWeight: 700,
                }}
              >
                Login
              </span>
            </button>
          </div>

          {/* FOOTER */}
          <p
            style={{
              margin: "24px 0 0",
              textAlign: "center",
              fontSize: 9,
              color: "#99978F",
            }}
          >
            <b>Scanity • See It. Know It. Eat It.</b>
          </p>
        </div>
      </div>
    </div>
  )
}


// ── Reset Password ──────────────────────────────────────────────────────────
function ResetPasswordScreen({ go }: { go: (s: Screen) => void }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)

  const isDesktop = useIsDesktop()
  const FONT = "'Poppins', sans-serif"

  const PALETTE = {
    pageBg: "#e8e5e0",
    green: "#176B3A",
    greenDark: "#155B32",
    greenLight: "#2E8B57",
    greenText: "#2E7D4F",
    cardWhite: "#FFFFFF",
    textDark: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E3DC",
  }

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  const sidebarMenu = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isDesktop
            ? "20px 20px 24px"
            : "18px 16px 22px",
        }}
      >
        <img
          src={logoImg}
          alt="Scanity"
          style={{
            width: isDesktop ? 48 : 42,
            height: isDesktop ? 48 : 42,
            objectFit: "contain",
          }}
        />

        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: isDesktop ? 22 : 18,
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Scan</span>
          <span style={{ color: "#9CE6B8" }}>ity</span>
        </span>
      </div>

      <p
        style={{
          margin: 0,
          padding: isDesktop
            ? "0 20px 10px"
            : "0 16px 10px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.50)",
        }}
      >
        MENU
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "0 10px",
        }}
      >
        {sidebarItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className="scanity-sidebar-item"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >

            <span
              style={{
                color: "#FFFFFF",
                fontSize: isDesktop ? 13 : 12,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="scanity-sidebar-item"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "transparent",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              color: "#FFFFFF",
              width: 19,
              textAlign: "center",
              transform: "scaleX(-1)",
            }}
          />

          <span
            style={{
              color: "#FFFFFF",
              fontSize: isDesktop ? 13 : 12,
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        background: PALETTE.pageBg,
        fontFamily: FONT,
      }}
    >
      <style>
        {`
          @keyframes scanityFadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scanitySidebarSlideIn {
            from {
              opacity: 0;
              transform: translateX(-45px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }

          .scanity-password-input {
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease;
          }

          .scanity-password-input:focus-within {
            border-color: #2E8B57 !important;
            box-shadow:
              0 0 0 3px rgba(46,139,87,0.10);
          }
        `}
      </style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(4px)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop ? "16px" : "10px",
              background:
                "linear-gradient(160deg, #155B32 0%, #176B3A 45%, #2E8B57 100%)",
              borderRadius: 26,
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              overflow: "hidden",
            }}
          >
            {sidebarMenu}
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: "28px 22px 22px",
              borderRadius: 28,
              background: "#FFFFFF",
              textAlign: "center",
              boxShadow:
                "0 25px 65px rgba(0,0,0,0.20)",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "rgba(23,107,58,0.10)",
                border: "2px solid #176B3A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,
                  color: "#176B3A",
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                color: "#1A1A1A",
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin: "0 0 20px",
                fontSize: 11,
                lineHeight: 1.5,
                color: "#6B6B6B",
              }}
            >
              You will need to login again to access
              your account.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #DADADA",
                  borderRadius: 14,
                  background: "#F5F5F5",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg,#155B32,#2E8B57)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(20,20,20,0.55)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: 28,
              borderRadius: 28,
              background: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <i
              className="fa fa-sign-out"
              style={{
                fontSize: 32,
                color: "#176B3A",
                marginBottom: 15,
              }}
            />

            <h2
              style={{
                margin: "0 0 7px",
                fontSize: 17,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin: "0 0 18px",
                fontSize: 11,
                color: "#6B6B6B",
              }}
            >
              Please wait...
            </p>

            <div
              style={{
                height: 8,
                borderRadius: 8,
                background: "#EDEDED",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#155B32,#2E8B57)",
                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div
        style={{
          paddingTop: SAFE_TOP,
          paddingLeft: isDesktop ? 40 : 18,
          paddingRight: isDesktop ? 40 : 18,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isDesktop ? 18 : 10,
        }}
      >
        <button
          type="button"
          onClick={() => go("forgotPassword")}
          style={{
            width: 42,
            height: 42,
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
          }}
        >
          <i
            className="fa fa-angle-left"
            style={{
              fontSize: 24,
              color: "#1A1A1A",
            }}
          />
        </button>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: isDesktop ? 24 : 19,
              fontWeight: 800,
              color: "#1A1A1A",
            }}
          >
            Reset Password
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: "#2E7D4F",
              fontWeight: 500,
            }}
          >
            Create a new secure password
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          style={{
            marginLeft: "auto",
            width: 42,
            height: 42,
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
          }}
        >
          <i
            className="fa fa-bars"
            style={{
              fontSize: 17,
              color: "#1A1A1A",
            }}
          />
        </button>
      </div>

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: isDesktop
              ? "20px 40px 40px"
              : "12px 16px 30px",
            boxSizing: "border-box",
          }}
        >
          {/* INTRO */}
          <div
            style={{
              padding: isDesktop
                ? "28px"
                : "22px 20px",
              marginBottom: 18,
              borderRadius: 22,
              background:
                "linear-gradient(145deg,#155B32,#176B3A,#2E8B57)",
              boxShadow:
                "0 12px 30px rgba(21,91,50,0.20)",
            }}
          >
            <div
              style={{
                background:
                  "rgba(255,255,255,0.13)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 15,
              }}
            >
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                color: "#FFFFFF",
                fontSize: 19,
                fontWeight: 800,
              }}
            >
              Choose a new password
            </h3>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.84)",
                fontSize: 11,
                lineHeight: 1.65,
              }}
            >
              Create a strong password and make sure
              both password fields match before
              continuing.
            </p>
          </div>

          {/* FORM */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E3DC",
              borderRadius: 22,
              padding: isDesktop
                ? 28
                : "22px 18px",
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.05)",
            }}
          >
            {/* NEW PASSWORD */}
            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: 11,
                fontWeight: 600,
                color: "#1A1A1A",
              }}
            >
              New Password
            </label>

            <div
              className="scanity-password-input"
              style={{
                height: isDesktop ? 52 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 15px",
                borderRadius: 14,
                background: "#F8F8F5",
                border:
                  password
                    ? "1px solid #2E8B57"
                    : "1px solid #E2E1DB",
              }}
            >
              <i
                className="fa fa-lock"
                style={{
                  color: "#176B3A",
                  fontSize: 15,
                }}
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter new password"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: FONT,
                  fontSize: 11,
                  color: "#1A1A1A",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#777",
                }}
              >
                <i
                  className={
                    showPassword
                      ? "fa fa-eye-slash"
                      : "fa fa-eye"
                  }
                />
              </button>
            </div>

            {/* CONFIRM */}
            <label
              style={{
                display: "block",
                margin:
                  "18px 0 7px",
                fontSize: 11,
                fontWeight: 600,
                color: "#1A1A1A",
              }}
            >
              Confirm Password
            </label>

            <div
              className="scanity-password-input"
              style={{
                height: isDesktop ? 52 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 15px",
                borderRadius: 14,
                background: "#F8F8F5",
                border:
                  confirmPassword
                    ? passwordsMatch
                      ? "1px solid #2E8B57"
                      : "1px solid #D96C6C"
                    : "1px solid #E2E1DB",
              }}
            >
              <i
                className="fa fa-lock"
                style={{
                  color: "#176B3A",
                  fontSize: 15,
                }}
              />

              <input
                type={
                  showConfirm
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: FONT,
                  fontSize: 11,
                  color: "#1A1A1A",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm(!showConfirm)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#777",
                }}
              >
                <i
                  className={
                    showConfirm
                      ? "fa fa-eye-slash"
                      : "fa fa-eye"
                  }
                />
              </button>
            </div>

            {/* MATCH STATUS */}
            {confirmPassword.length > 0 && (
              <div
                style={{
                  marginTop: 9,
                  padding: "9px 11px",
                  borderRadius: 10,
                  background: passwordsMatch
                    ? "rgba(46,139,87,0.08)"
                    : "rgba(217,108,108,0.08)",
                  color: passwordsMatch
                    ? "#2E7D4F"
                    : "#B84E4E",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                <i
                  className={
                    passwordsMatch
                      ? "fa fa-check"
                      : "fa fa-times"
                  }
                  style={{
                    marginRight: 6,
                  }}
                />

                {passwordsMatch
                  ? "Passwords match"
                  : "Passwords do not match"}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="button"
              disabled={!passwordsMatch}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              onMouseLeave={() => setPressed(false)}
              onClick={() => {
                if (passwordsMatch) {
                  go("confirmationPassword")
                }
              }}
              style={{
                width: "100%",
                height: isDesktop ? 52 : 48,
                marginTop: 20,
                border: "none",
                borderRadius: 14,
                background: !passwordsMatch
                  ? "#D8D8D3"
                  : pressed
                    ? "#155B32"
                    : "linear-gradient(135deg,#155B32,#2E8B57)",
                color: "#FFFFFF",
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                cursor: !passwordsMatch
                  ? "not-allowed"
                  : "pointer",
                boxShadow: !passwordsMatch
                  ? "none"
                  : "0 7px 20px rgba(21,91,50,0.20)",
              }}
            >
              Reset Password
              <i
                className="fa fa-arrow-right"
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                }}
              />
            </button>
          </div>

          <p
            style={{
              margin: "24px 0 0",
              textAlign: "center",
              fontSize: 9,
              color: "#99978F",
            }}
          >
            <b>Scanity • See It. Know It. Eat It.</b>
          </p>
        </div>
      </div>
    </div>
  )
}


// ── Confirmation Password ───────────────────────────────────────────────────
function ConfirmationPasswordScreen({
  go,
}: {
  go: (s: Screen) => void
}) {
  const isDesktop = useIsDesktop()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false)
  const [showLogoutLoading, setShowLogoutLoading] =
    useState(false)

  const FONT = "'Poppins', sans-serif"

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)

    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  const sidebarItems = [
    {
      icon: "fa-home",
      label: "Dashboard",
      screen: "dashboard" as Screen,
    },
    {
      icon: "fa-gear",
      label: "Settings",
      screen: "settings" as Screen,
    },
    {
      icon: "fa-question-circle",
      label: "Help & FAQ",
      screen: "help" as Screen,
    },
  ]

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        background: "#e8e5e0",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      <style>
        {`
          @keyframes successPop {
            from {
              opacity: 0;
              transform: scale(0.7);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes successFade {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .scanity-sidebar-item {
            transition:
              background 0.18s ease,
              transform 0.15s ease;
          }

          .scanity-sidebar-item:hover {
            background: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }

          .scanity-success-button {
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease;
          }

          .scanity-success-button:hover {
            transform: translateY(-2px);
            box-shadow:
              0 12px 28px rgba(21,91,50,0.24) !important;
          }
        `}
      </style>

      {/* TOP BAR */}
      <div
        style={{
          paddingTop: SAFE_TOP,
          paddingLeft: isDesktop ? 40 : 18,
          paddingRight: isDesktop ? 40 : 18,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isDesktop ? 18 : 10,
        }}
      >
        <button
          type="button"
          onClick={() => go("resetPassword")}
          style={{
            width: 42,
            height: 42,
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
          }}
        >
          <i
            className="fa fa-angle-left"
            style={{
              fontSize: 24,
              color: "#1A1A1A",
            }}
          />
        </button>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: isDesktop ? 24 : 19,
              fontWeight: 800,
              color: "#1A1A1A",
            }}
          >
            Password Reset
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: "#2E7D4F",
              fontWeight: 500,
            }}
          >
            Your account is ready
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          style={{
            marginLeft: "auto",
            width: 42,
            height: 42,
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.05)",
          }}
        >
          <i
            className="fa fa-bars"
            style={{
              fontSize: 17,
              color: "#1A1A1A",
            }}
          />
        </button>
      </div>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(4px)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 51,
              width: isDesktop ? 245 : 220,
              height: `calc(100% - ${
                isDesktop ? 32 : 20
              }px)`,
              margin: isDesktop ? "16px" : "10px",
              background:
                "linear-gradient(160deg,#155B32,#176B3A,#2E8B57)",
              borderRadius: 26,
              boxShadow:
                "0 25px 55px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              overflow: "hidden",
            }}
          >
            {/* LOGO */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "20px",
              }}
            >
              <img
                src={logoImg}
                alt="Scanity"
                style={{
                  width: 46,
                  height: 46,
                  objectFit: "contain",
                }}
              />

              <span
                style={{
                  fontWeight: 800,
                  fontSize: 21,
                }}
              >
                <span style={{ color: "#FFFFFF" }}>
                  Scan
                </span>
                <span style={{ color: "#9CE6B8" }}>
                  ity
                </span>
              </span>
            </div>

            <p
              style={{
                margin: 0,
                padding: "0 20px 10px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color:
                  "rgba(255,255,255,0.50)",
              }}
            >
              MENU
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "0 10px",
              }}
            >
              {sidebarItems.map((item) => (
                <button
                  key={item.screen}
                  type="button"
                  className="scanity-sidebar-item"
                  onClick={() => {
                    setSidebarOpen(false)
                    go(item.screen)
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 14,
                    cursor: "pointer",
                    color: "#FFFFFF",
                    textAlign: "left",
                  }}
                >
                
                  <span
                    style={{
                      fontSize: 13,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="scanity-sidebar-item"
                onClick={() =>
                  setShowLogoutConfirm(true)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 14,
                  cursor: "pointer",
                  color: "#FFFFFF",
                  textAlign: "left",
                }}
              >
                <i
                  className="fa fa-sign-out"
                  style={{
                    width: 19,
                    textAlign: "center",
                    transform: "scaleX(-1)",
                  }}
                />

                <span style={{ fontSize: 13 }}>
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: isDesktop
              ? "35px 40px 50px"
              : "20px 16px 35px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E3DC",
              borderRadius: 24,
              padding: isDesktop
                ? "50px 40px"
                : "36px 20px",
              textAlign: "center",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.06)",
              animation:
                "successFade 0.5s ease-out both",
            }}
          >
            {/* SUCCESS ICON */}
            <div
              style={{
                width: isDesktop ? 100 : 86,
                height: isDesktop ? 100 : 86,
                margin: "0 auto 22px",
                borderRadius: "50%",
                background:
                  "linear-gradient(145deg,#155B32,#2E8B57)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 12px 30px rgba(21,91,50,0.22)",
                animation:
                  "successPop 0.5s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              <i
                className="fa fa-check"
                style={{
                  fontSize: isDesktop ? 48 : 40,
                  color: "#FFFFFF",
                }}
              />
            </div>

            {/* TITLE */}
            <h1
              style={{
                margin: "0 0 10px",
                fontSize: isDesktop ? 27 : 21,
                lineHeight: 1.25,
                fontWeight: 800,
                color: "#1A1A1A",
              }}
            >
              Password Reset
              <br />
              Successfully!
            </h1>

            {/* DESCRIPTION */}
            <p
              style={{
                maxWidth: 420,
                margin: "0 auto",
                fontSize: isDesktop ? 12 : 10,
                lineHeight: 1.7,
                color: "#6B6B6B",
              }}
            >
              Your password has been successfully
              updated. You can now log in using your
              new password.
            </p>

            {/* STATUS CARD */}
            <div
              style={{
                maxWidth: 420,
                margin: "24px auto 0",
                padding: "14px 16px",
                borderRadius: 15,
                background:
                  "rgba(23,107,58,0.07)",
                border:
                  "1px solid rgba(23,107,58,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 11,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#176B3A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className="fa fa-shield"
                  style={{
                    color: "#FFFFFF",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1A1A1A",
                  }}
                >
                  Your account is secure
                </p>

                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 9,
                    color: "#6B6B6B",
                  }}
                >
                  Your new password is now active.
                </p>
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="button"
              className="scanity-success-button"
              onClick={() => go("login")}
              style={{
                width: "100%",
                maxWidth: 420,
                height: isDesktop ? 52 : 48,
                marginTop: 24,
                border: "none",
                borderRadius: 14,
                background:
                  "linear-gradient(135deg,#155B32,#2E8B57)",
                color: "#FFFFFF",
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow:
                  "0 8px 22px rgba(21,91,50,0.20)",
              }}
            >
              Back to Login
              <i
                className="fa fa-arrow-right"
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                }}
              />
            </button>

            <p
              style={{
                margin: "24px 0 0",
                fontSize: 9,
                color: "#99978F",
              }}
            >
              <b>Scanity • See It. Know It. Eat It.</b>
            </p>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(20,20,20,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: 24,
              borderRadius: 28,
              background: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <i
              className="fa fa-sign-out"
              style={{
                fontSize: 30,
                color: "#176B3A",
                marginBottom: 14,
              }}
            />

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                color: "#1A1A1A",
              }}
            >
              Are you sure you want to logout?
            </h2>

            <p
              style={{
                margin: "0 0 20px",
                fontSize: 11,
                color: "#6B6B6B",
              }}
            >
              You will need to login again to access
              your account.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #DADADA",
                  borderRadius: 14,
                  background: "#F5F5F5",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg,#155B32,#2E8B57)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {showLogoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(20,20,20,0.55)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: 28,
              borderRadius: 28,
              background: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <i
              className="fa fa-sign-out"
              style={{
                fontSize: 32,
                color: "#176B3A",
                marginBottom: 15,
              }}
            />

            <h2
              style={{
                margin: "0 0 7px",
                fontSize: 17,
              }}
            >
              Logging Out
            </h2>

            <p
              style={{
                margin: "0 0 18px",
                fontSize: 11,
                color: "#6B6B6B",
              }}
            >
              Please wait...
            </p>

            <div
              style={{
                height: 8,
                borderRadius: 8,
                background: "#EDEDED",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#155B32,#2E8B57)",
                  animation:
                    "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Language Screen ───────────────────────────────────────────────────────────
const LANGUAGES = [
  {
    code: "en-US",
    label: "English (United States)",
    native: "English (United States)",
  },
  { code: "cs", label: "Čeština", native: "Czech" },
  { code: "da", label: "Dansk", native: "Danish" },
  { code: "nl-BE", label: "Nederlands (België)", native: "Dutch (Belgium)" },
  {
    code: "nl-NL",
    label: "Nederlands (Nederland)",
    native: "Dutch (The Netherlands)",
  },
  {
    code: "en-AU",
    label: "English (Australia)",
    native: "English (Australia)",
  },
  {
    code: "en-GB",
    label: "English (United Kingdom)",
    native: "English (United Kingdom)",
  },
  { code: "fi", label: "Suomi", native: "Finnish" },
  { code: "fr", label: "Français", native: "French" },
  { code: "de", label: "Deutsch", native: "German" },
  { code: "ms", label: "Bahasa Melayu", native: "Malay" },
  { code: "zh", label: "普通话", native: "Mandarin" },
  { code: "ta", label: "தமிழ்", native: "Tamil" },
  { code: "ar", label: "العربية", native: "Arabic" },
  { code: "es", label: "Español", native: "Spanish" },
  { code: "ja", label: "日本語", native: "Japanese" },
  { code: "ko", label: "한국어", native: "Korean" },
]
function LanguageScreen({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState("en-US")
  const [query, setQuery] = useState("")
  const filtered = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(query.toLowerCase()) ||
      l.native.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "100%",
        overflow: "hidden",
        background: "#071A0F",
      }}
    >
      {/* Header */}
      <Center maxWidth={640} style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: SAFE_TOP,
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 0,
          }}
        >
          <button
            type="button"
            onClick={() => go("settings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.textOnDark}
              strokeWidth="2.2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        <p
          style={{
            margin: "10px 20px 16px",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: C.textOnDark,
          }}
        >
          Language
        </p>
        {/* Search bar */}
        <div
          style={{
            margin: "0 16px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(20,55,35,0.80)",
            border: "1.5px solid rgba(224,167,46,0.22)",
            borderRadius: 14,
            padding: "0 14px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search languages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              color: C.textOnDark,
              padding: "12px 0",
              caretColor: C.greenLight,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.4)",
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </Center>
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
        <Center maxWidth={640} style={{ padding: "0 16px 16px" }}>
        {filtered.map((lang, i) => {
          const active = selected === lang.code
          const isLast = i === filtered.length - 1
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelected(lang.code)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "14px 4px",
                background: "none",
                border: "none",
                borderBottom: isLast
                  ? "none"
                  : "1px solid rgba(224,167,46,0.1)",
                cursor: "pointer",
                textAlign: "left",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: active ? C.greenLight : C.textOnDark,
                  }}
                >
                  {lang.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 2,
                  }}
                >
                  {lang.native}
                </p>
              </div>
              {/* Radio button */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${
                    active ? C.greenLight : "rgba(255,255,255,0.3)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: active ? C.greenLight : "transparent",
                }}
              >
                {active && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#071A0F",
                    }}
                  />
                )}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              marginTop: 32,
            }}
          >
            No languages found
          </p>
        )}
        </Center>
      </div>
      {/* Save button */}
      <Center maxWidth={640} style={{ position: "relative", zIndex: 1, padding: "12px 16px 32px", width: "100%" }}>
        <button
          type="button"
          onClick={() => go("settings")}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 16,
            border: "none",
            background: "linear-gradient(135deg, #E0A72E, #C98A1F)",
            color: "#071A0F",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(224,167,46,0.4)",
          }}
        >
          Save Language
        </button>
      </Center>
    </div>
  )
}
// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("splash")
  const screenMap: Record<Screen, ReactNode> = {
    splash: <SplashScreen go={setScreen} />,
    login: <LoginScreen go={setScreen} />,
    register: <RegisterScreen go={setScreen} />,
    success: <SuccessScreen go={setScreen} />,
    allergies: <AllergiesScreen go={setScreen} />,
    health: <HealthScreen go={setScreen} />,
    loading: <LoadingScreen go={setScreen} />,
    allset: <AllSetScreen go={setScreen} />,
    dashboard: <DashboardScreen go={setScreen} />,
    history: <ScanHistoryScreen go={setScreen} />,
    profile: <ProfileScreen go={setScreen} />,
    help: <HelpFaqScreen go={setScreen} />,
    about: <AboutScreen go={setScreen} />,
    privacy: <LegalScreen go={setScreen} kind="privacy" />,
    terms: <LegalScreen go={setScreen} kind="terms" />,
    barcode: <BarcodeScannerScreen go={setScreen} />,
    ocr: <OCRScannerScreen go={setScreen} />,
    settings: <SettingsScreen go={setScreen} />,
    delete: <DeleteAccountScreen go={setScreen} />,
    forgotPassword: <ForgotPasswordScreen go={setScreen} />,
    resetPassword: <ResetPasswordScreen go={setScreen} />,
    confirmationPassword: <ConfirmationPasswordScreen go={setScreen} />,
    language: <LanguageScreen go={setScreen} />,
    productResult: <ProductResultScreen go={setScreen} />,
    productCompare: <ProductCompareScreen go={setScreen} />,
  }
  return <AppFrame>{screenMap[screen]}</AppFrame>
}

