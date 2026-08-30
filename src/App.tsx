import { useState, useEffect, Fragment, type ReactNode, type CSSProperties } from "react"
import logoImg from "@/imports/image-19.png"
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
            filter: "brightness(1.15) saturate(1.25)",
          }}
        />
        {/* Brand name */}
        <div style={{ textAlign: "center", marginTop: -16 }}>
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
          }}
        >
          Already have an account?{" "}
          <button
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
              Welcome Back!
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
              Please login to continue
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
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />

            {/* Forgot password */}
            <div
              style={{
                textAlign: "right",
                marginTop: 4,
                marginBottom: isDesktop ? 32 : 28,
              }}
            >
              <button
                type="button"
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

            {/* Login button */}
            <PrimaryBtn
              label="LOGIN"
              onClick={() => go("success")}
              color={C.mocha}
            />

            {/* Register */}
            <p
              style={{
                textAlign: "center",
                marginTop: 22,
                fontSize: isDesktop ? 14 : 13,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Don't have an account?{" "}
              <button
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
                width: 40,
                height: 3,
                borderRadius: 2,
                background: C.green,
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
                width: 6,
                height: 3,
                borderRadius: 2,
                background: C.gray,
              }}
            />
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
    name: "Juice",
    date: "Aug 5, 2026",
    time: "6:30 PM",
    score: 72,
    safe: true,
  },
]
function DashboardScreen({ go }: { go: (s: Screen) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutLoading, setShowLogoutLoading] = useState(false)
  const isDesktop = useIsDesktop()

  // ── Dashboard Small Cards ────────────────────────────────────────────────
  const cards = [
    {
      label: "Scan OCR",
      icon: <i className="fa fa-file-text-o" />,
      action: () => go("ocr"),
    },
    {
      label: "Scan History",
      icon: <i className="fa fa-history" />,
      action: () => go("history"),
    },
    {
      label: "Compare Products",
      icon: <i className="fa fa-users" />,
      action: () => go("productCompare"),
    },
  ]

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setShowLogoutLoading(true)
    setTimeout(() => {
      setShowLogoutLoading(false)
      setSidebarOpen(false)
      go("splash")
    }, 1800)
  }

  // Shared sidebar menu content — used inside the slide-out drawer on
  // every screen size.
  const sidebarMenu = (
    <>
      {/* ── User Information ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "rgba(224,167,46,0.16)",
            border: "1px solid rgba(224,167,46,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i
            className="fa fa-user"
            style={{
              fontSize: 18,
              color: C.greenLight,
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: C.textOnDark,
            }}
          >
            Hello, User!
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.50)",
            }}
          >
            user@email.com
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {[
          { icon: "fa-user", label: "My Profile", screen: "profile" as Screen },
          { icon: "fa-gear", label: "Settings", screen: "settings" as Screen },
          { icon: "fa-question-circle", label: "Help & FAQ", screen: "help" as Screen },
          { icon: "fa-info-circle", label: "About", screen: "about" as Screen },
        ].map((item) => (
          <button
            key={item.screen}
            type="button"
            onClick={() => {
              setSidebarOpen(false)
              go(item.screen)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className={`fa ${item.icon}`}
                style={{
                  fontSize: 17,
                  color: C.greenLight,
                }}
              />
            </span>
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: C.textOnDark,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          margin: "0 14px",
          padding: "13px 14px",
          background: "rgba(224,167,46,0.08)",
          border: "1px solid rgba(224,167,46,0.18)",
          borderRadius: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "rgba(224,167,46,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className="fa fa-sign-out"
            style={{
              fontSize: 15,
              color: C.greenLight,
            }}
          />
        </span>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: C.textOnDark,
          }}
        >
          Logout
        </span>
      </button>
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
        background: "#071C10",
      }}
    >
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5, 28, 15, 0.84)",
        }}
      />

      {/* Slide-out sidebar — same behavior on every screen size, opened only via the hamburger button */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
          }}
        >
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 21,
              width: isDesktop ? 300 : 260,
              height: "100%",
              background: "rgba(7, 35, 19, 0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "6px 0 35px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
              paddingTop: SAFE_TOP,
              paddingLeft: 0,
              paddingRight: 0,
              paddingBottom: 24,
              borderRight: "1px solid rgba(224,167,46,0.18)",
              boxSizing: "border-box",
            }}
          >
            {isDesktop && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
              </div>
            )}
            {sidebarMenu}
          </div>
        </div>
      )}

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
            background: "rgba(2, 18, 9, 0.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 310,
              padding: "28px 22px 22px",
              borderRadius: 24,
              background:
                "linear-gradient(145deg, rgba(25,68,39,0.98), rgba(9,39,22,0.98))",
              border: "1px solid rgba(224,167,46,0.38)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "rgba(224,167,46,0.12)",
                border: "2px solid rgba(224,167,46,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(224,167,46,0.12)",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 30,
                  color: C.greenLight,
                }}
              />
            </div>
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: C.textOnDark,
                lineHeight: 1.35,
              }}
            >
              Are you sure you want to logout?
            </h2>
            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: 240,
                fontFamily: "'Poppins', sans-serif",
                fontSize: 9,
                lineHeight: "14px",
                color: "rgba(255,255,255,0.60)",
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
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  height: 42,
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.10)",
                  color: C.textOnDark,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: 10,
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
                  height: 42,
                  border: "none",
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #E0A72E 0%, #C98A1F 100%)",
                  color: "#FFFFFF",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  cursor: "pointer",
                  boxShadow: "0 5px 18px rgba(224,167,46,0.25)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

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
            background: "rgba(2,18,9,0.84)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "30px 22px 24px",
              borderRadius: 24,
              background:
                "linear-gradient(145deg, rgba(25,68,39,0.98), rgba(9,39,22,0.98))",
              border: "1px solid rgba(224,167,46,0.32)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "rgba(224,167,46,0.10)",
                border: "2px solid rgba(224,167,46,0.38)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa fa-sign-out"
                style={{
                  fontSize: 29,
                  color: C.greenLight,
                }}
              />
            </div>
            <h2
              style={{
                margin: "0 0 7px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: C.textOnDark,
              }}
            >
              Logging Out
            </h2>
            <p
              style={{
                margin: "0 0 19px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: 9,
                color: "rgba(255,255,255,0.55)",
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
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  width: "0%",
                  height: "100%",
                  borderRadius: 8,
                  background: "linear-gradient(90deg, #E0A72E, #C98A1F)",
                  animation: "logoutProgress 1.8s linear forwards",
                }}
              />
            </div>
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
        `}
      </style>

      {/* ═══════ Content shell — full width; sidebar is always an overlay drawer ═══════ */}
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
        {/* Nav bar — always visible, hamburger opens the drawer on every screen size */}
        <div
          style={{
            paddingTop: SAFE_TOP,
            paddingLeft: isDesktop ? 40 : 20,
            paddingRight: isDesktop ? 40 : 20,
            paddingBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 15,
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <img
            src={logoImg}
            alt="Scanity logo"
            style={{
              width: 60,
              height: 60,
              objectFit: "contain",
              mixBlendMode: "screen",
            }}
          />
          <button
            type="button"
            onClick={() => go("profile")}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(224,167,46,0.20)",
              border: "1.5px solid rgba(224,167,46,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.greenLight}
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

        {/* Greeting */}
        <div
          style={{
            padding: isDesktop ? "8px 40px 16px" : "4px 20px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: isDesktop ? 26 : 22,
                color: C.textOnDark,
                marginBottom: 2,
                marginTop: 2,
              }}
            >
              Hello, User!
            </h2>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.50)",
                margin: 0,
              }}
            >
              See It. Know It. Eat It.
            </p>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isDesktop ? "0 40px 40px" : "0 16px 24px",
            minHeight: 0,
          }}
        >
          <Center maxWidth={isDesktop ? 900 : undefined}>
            {/* SCAN BARCODE HERO — now taller on desktop so it reads as the primary action */}
            <button
              type="button"
              onClick={() => go("barcode")}
              style={{
                width: "100%",
                height: isDesktop ? 220 : 150,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                borderRadius: 20,
                background: "rgba(40,90,55,0.88)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "2px solid rgba(224,167,46,0.70)",
                boxShadow:
                  "0 8px 32px rgba(224,167,46,0.20), inset 0 1px 0 rgba(255,255,255,0.10)",
                cursor: "pointer",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            >
              <svg
                width={isDesktop ? 64 : 52}
                height={isDesktop ? 64 : 52}
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.greenLight}
                strokeWidth="1.4"
              >
                <path d="M3 9V6a1 1 0 011-1h3" />
                <path d="M3 15v3a1 1 0 001 1h3" />
                <path d="M15 5h3a1 1 0 011 1v3" />
                <path d="M15 19h3a1 1 0 001-1v-3" />
                <line x1="7" y1="8" x2="7" y2="16" />
                <line x1="10" y1="8" x2="10" y2="16" />
                <line x1="13" y1="8" x2="13" y2="16" />
                <line x1="16" y1="8" x2="16" y2="16" />
              </svg>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: isDesktop ? 18 : 16,
                  color: C.textOnDark,
                }}
              >
                Scan Barcode
              </span>
            </button>

            {/* SMALL CARDS — now stretch full width (1fr each) to align with the hero above */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                rowGap: 14,
                columnGap: isDesktop ? 14 : 10,
                marginBottom: 18,
              }}
            >
              {cards.map((card) => (
                <button
                  type="button"
                  key={card.label}
                  onClick={card.action}
                  style={{
                    minHeight: isDesktop ? 100 : 76,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "rgba(20,70,40,0.75)",
                    border: "1px solid #E0A72E",
                    borderRadius: 12,
                    padding: "10px 6px",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: isDesktop ? 34 : 30,
                      height: isDesktop ? 34 : 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: C.greenLight,
                      fontSize: isDesktop ? 22 : 20,
                    }}
                  >
                    {card.icon}
                  </div>
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      fontSize: isDesktop ? 12 : 9,
                      lineHeight: "13px",
                      color: C.greenLight,
                      textAlign: "center",
                    }}
                  >
                    {card.label}
                  </span>
                </button>
              ))}
            </div>

            {/* RECENT SCANS */}
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 16,
                background: "rgba(12,45,25,0.92)",
                border: "1px solid rgba(224,167,46,0.35)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 6px 8px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#FFFFFF",
                  }}
                >
                  Recent Scans
                </h3>
                <button
                  type="button"
                  onClick={() => go("history")}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    color: C.greenLight,
                    cursor: "pointer",
                  }}
                >
                  View All
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
                  gap: 8,
                }}
              >
                {RECENT_SCANS.map((scan) => (
                  <button
                    type="button"
                    key={`${scan.name}-${scan.time}`}
                    onClick={() => go("productResult")}
                    style={{
                      width: "100%",
                      minHeight: 68,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      background: "#2F6B42",
                      border: "1px solid rgba(224,167,46,0.35)",
                      borderRadius: 12,
                      boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(224,167,46,0.16)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="fa fa-shopping-bag"
                        style={{
                          fontSize: 18,
                          color: C.greenLight,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                          color: C.textOnDark,
                        }}
                      >
                        {scan.name}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: 8,
                          color: "rgba(255,255,255,0.55)",
                        }}
                      >
                        {scan.date} • {scan.time}
                      </p>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 800,
                          fontSize: 20,
                          color: C.textOnDark,
                          lineHeight: 1,
                        }}
                      >
                        {scan.score}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 4,
                          marginTop: 3,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: scan.safe ? "#4CAF50" : "#E53E3E",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: 8,
                            color: "rgba(255,255,255,0.60)",
                          }}
                        >
                          {scan.safe ? "Safe" : "Unsafe"}
                        </span>
                      </div>
                    </div>
                    <i
                      className="fa fa-angle-right"
                      style={{
                        fontSize: 16,
                        color: "rgba(255,255,255,0.45)",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </Center>
        </div>
      </div>
    </div>
  )
}
// ── Barcode Scanner Screen ────────────────────────────────────────────────────
function BarcodeScannerScreen({ go }: { go: (s: Screen) => void }) {
  const [showHelp, setShowHelp] = useState(false)
  const isDesktop = useIsDesktop()
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Same background as Dashboard */}
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
      {/* Dark green overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.86)",
        }}
      />

      {/* ── Header — */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 10}}>
        <InfoHeader
          title="Scan Barcode"
          subtitle="Align barcode within the frame"
          go={go}
        />
      </div>

      {/* Content */}
      <Center
        maxWidth={isDesktop ? 900 : 640}
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {/* ── Help Popup ── */}
        {showHelp && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 25,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 360,
                background:
                  "linear-gradient(145deg, rgba(25,68,39,0.98), rgba(9,39,22,0.98))",
                border: "1px solid rgba(224,167,46,0.35)",
                borderRadius: 20,
                padding: 26,
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                boxSizing: "border-box",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(224,167,46,0.14)",
                  border: "1.5px solid rgba(224,167,46,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <i
                  className="fa fa-question-circle"
                  style={{ color: C.greenLight, fontSize: 22 }}
                />
              </div>

              {/* Help title */}
              <h3
                style={{
                  margin: "0 0 16px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  color: C.textOnDark,
                }}
              >
                How to Scan a Barcode
              </h3>

              {/* Instructions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 22,
                }}
              >
                {[
                  "Position the barcode inside the frame.",
                  "Keep your phone steady and make sure the barcode is clearly visible.",
                  "Wait for the scanner to recognize the barcode automatically.",
                ].map((step, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "rgba(224,167,46,0.16)",
                        border: "1px solid rgba(224,167,46,0.4)",
                        color: C.greenLight,
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.72)",
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  width: "100%",
                  padding: 13,
                  border: "1px solid rgba(224,167,46,0.55)",
                  borderRadius: 13,
                  background: "linear-gradient(135deg, #E0A72E 0%, #C98A1F 100%)",
                  color: "#FFFFFF",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 5px 18px rgba(224,167,46,0.25)",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* ── Main centered block ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: isDesktop ? "0 30px" : "0 20px",
            filter: showHelp ? "blur(6px)" : "none",      
            transition: "filter 0.25s ease",               
            pointerEvents: showHelp ? "none" : "auto",
          }}
        >
          {/* ── Scan card ── */}
          <div
            style={{
              position: "relative",
              borderRadius: 26,
              background: "rgba(35,55,40,0.55)",
              border: "1px solid rgba(224,167,46,0.22)",
              padding: isDesktop ? "42px 42px 48px" : "26px 20px 32px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            {/* Help button — top-right of the card */}
            <button
              onClick={() => setShowHelp(true)}
              style={{
                position: "absolute",
                top: isDesktop ? 26 : 16,
                right: isDesktop ? 26 : 16,
                width: isDesktop ? 40 : 34,
                height: isDesktop ? 40 : 34,
                borderRadius: "50%",
                border: "1px solid rgba(224,167,46,0.5)",
                background: "rgba(40,90,55,0.7)",
                color: C.textOnDark,
                fontWeight: 1000,
                fontSize: isDesktop ? 16 : 14,
                cursor: "pointer",
              }}
            >
              ?
            </button>

            {/* Title + subtitle, centered */}
            <div style={{ textAlign: "center", marginBottom: isDesktop ? 34 : 24 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: isDesktop ? 30 : 20,
                  color: C.textOnDark,
                }}
              >
                Scan Barcode
              </h2>
              <p
                style={{
                  margin: isDesktop ? "8px 0 0" : "4px 0 0",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 15 : 12,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Align barcode within the frame
              </p>
            </div>

            {/* ── Scanner Area ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: isDesktop ? 500 : 320,
                  height: isDesktop ? 400 : 290,
                  position: "relative",
                  borderRadius: 20,
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                {/* Top Left */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderTop: "6px solid #E0A72E",
                    borderLeft: "6px solid #E0A72E",
                    borderRadius: "18px 0 0 0",
                  }}
                />
                {/* Top Right */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderTop: "6px solid #E0A72E",
                    borderRight: "6px solid #E0A72E",
                    borderRadius: "0 18px 0 0",
                  }}
                />
                {/* Bottom Left */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderBottom: "6px solid #E0A72E",
                    borderLeft: "6px solid #E0A72E",
                    borderRadius: "0 0 0 18px",
                  }}
                />
                {/* Bottom Right */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderBottom: "6px solid #E0A72E",
                    borderRight: "6px solid #E0A72E",
                    borderRadius: "0 0 18px 0",
                  }}
                />
                {/* Scanning Line */}
                <div
                  style={{
                    position: "absolute",
                    left: isDesktop ? 32 : 25,
                    right: isDesktop ? 32 : 25,
                    top: "50%",
                    height: isDesktop ? 3 : 2,
                    background: C.greenLight,
                    boxShadow: "0 0 12px #E0A72E",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Bottom Controls — directly under the card ── */}
          <div
            style={{
              marginTop: isDesktop ? 26 : 18,
              height: isDesktop ? 90: 84,
              borderRadius: 20,
              background: "rgba(35,55,40,0.94)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              border: "1px solid rgba(224,167,46,0.25)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
            }}
          >
            {/* Camera */}
            <button
              onClick={() => go("productResult")}
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </div>
              Camera
            </button>
            {/* Rotate Camera */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                  <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                  <polyline points="3 21 3 16 8 16" />
                </svg>
              </div>
              <div>Rotate</div>
              <div>Camera</div>
            </button>
            {/* Gallery */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              Gallery
            </button>
            {/* Flash */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
                </svg>
              </div>
              Flash
            </button>
          </div>
        </div>
      </Center>
    </div>
  )
}

// ── Ocr Scanner ─────────────────────────────────────────────────────────────────
function OCRScannerScreen({ go }: { go: (s: Screen) => void }) {
  const [showHelp, setShowHelp] = useState(false)
  const isDesktop = useIsDesktop()
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Same background as Dashboard */}
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
      {/* Dark green overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(12,32,18,0.86)",
        }}
      />

      {/* ── Header — */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 10}}>
        <InfoHeader
          title="Scan Nutrion Label"
          subtitle="Align OCR within the frame"
          go={go}
        />
      </div>

      {/* Content */}
      <Center
        maxWidth={isDesktop ? 900 : 640}
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {/* ── Help Popup ── */}
        {showHelp && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 25,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 360,
                background:
                  "linear-gradient(145deg, rgba(25,68,39,0.98), rgba(9,39,22,0.98))",
                border: "1px solid rgba(224,167,46,0.35)",
                borderRadius: 20,
                padding: 26,
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                boxSizing: "border-box",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(224,167,46,0.14)",
                  border: "1.5px solid rgba(224,167,46,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <i
                  className="fa fa-question-circle"
                  style={{ color: C.greenLight, fontSize: 22 }}
                />
              </div>

              {/* Help title */}
              <h3
                style={{
                  margin: "0 0 16px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  color: C.textOnDark,
                }}
              >
                How to Scan a OCR
              </h3>

              {/* Instructions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 22,
                }}
              >
                {[
                  "Position the OCR inside the frame.",
                  "Keep your phone steady and make sure the OCR is clearly visible.",
                  "Wait for the scanner to recognize the OCR automatically.",
                ].map((step, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "rgba(224,167,46,0.16)",
                        border: "1px solid rgba(224,167,46,0.4)",
                        color: C.greenLight,
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.72)",
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  width: "100%",
                  padding: 13,
                  border: "1px solid rgba(224,167,46,0.55)",
                  borderRadius: 13,
                  background: "linear-gradient(135deg, #E0A72E 0%, #C98A1F 100%)",
                  color: "#FFFFFF",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 5px 18px rgba(224,167,46,0.25)",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* ── Main centered block ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: isDesktop ? "0 30px" : "0 20px",
            filter: showHelp ? "blur(6px)" : "none",       
            transition: "filter 0.25s ease",               
            pointerEvents: showHelp ? "none" : "auto",
          }}
        >
          {/* ── Scan card ── */}
          <div
            style={{
              position: "relative",
              borderRadius: 26,
              background: "rgba(35,55,40,0.55)",
              border: "1px solid rgba(224,167,46,0.22)",
              padding: isDesktop ? "42px 42px 48px" : "26px 20px 32px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            {/* Help button — top-right of the card */}
            <button
              onClick={() => setShowHelp(true)}
              style={{
                position: "absolute",
                top: isDesktop ? 26 : 16,
                right: isDesktop ? 26 : 16,
                width: isDesktop ? 40 : 34,
                height: isDesktop ? 40 : 34,
                borderRadius: "50%",
                border: "1px solid rgba(224,167,46,0.5)",
                background: "rgba(40,90,55,0.7)",
                color: C.textOnDark,
                fontWeight: 1000,
                fontSize: isDesktop ? 16 : 14,
                cursor: "pointer",
              }}
            >
              ?
            </button>

            {/* Title + subtitle, centered */}
            <div style={{ textAlign: "center", marginBottom: isDesktop ? 34 : 24 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: isDesktop ? 30 : 20,
                  color: C.textOnDark,
                }}
              >
                Scan OCR
              </h2>
              <p
                style={{
                  margin: isDesktop ? "8px 0 0" : "4px 0 0",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 15 : 12,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Align OCR within the frame
              </p>
            </div>

            {/* ── Scanner Area ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: isDesktop ? 500 : 320,
                  height: isDesktop ? 400 : 290,
                  position: "relative",
                  borderRadius: 20,
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                {/* Top Left */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderTop: "6px solid #E0A72E",
                    borderLeft: "6px solid #E0A72E",
                    borderRadius: "18px 0 0 0",
                  }}
                />
                {/* Top Right */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderTop: "6px solid #E0A72E",
                    borderRight: "6px solid #E0A72E",
                    borderRadius: "0 18px 0 0",
                  }}
                />
                {/* Bottom Left */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderBottom: "6px solid #E0A72E",
                    borderLeft: "6px solid #E0A72E",
                    borderRadius: "0 0 0 18px",
                  }}
                />
                {/* Bottom Right */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: isDesktop ? 60 : 52,
                    height: isDesktop ? 60 : 52,
                    borderBottom: "6px solid #E0A72E",
                    borderRight: "6px solid #E0A72E",
                    borderRadius: "0 0 18px 0",
                  }}
                />
                {/* Scanning Line */}
                <div
                  style={{
                    position: "absolute",
                    left: isDesktop ? 32 : 25,
                    right: isDesktop ? 32 : 25,
                    top: "50%",
                    height: isDesktop ? 3 : 2,
                    background: C.greenLight,
                    boxShadow: "0 0 12px #E0A72E",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Bottom Controls — directly under the card ── */}
          <div
            style={{
              marginTop: isDesktop ? 26 : 18,
              height: isDesktop ? 90: 84,
              borderRadius: 20,
              background: "rgba(35,55,40,0.94)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              border: "1px solid rgba(224,167,46,0.25)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
            }}
          >
            {/* Camera */}
            <button
              onClick={() => go("productResult")}
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </div>
              Camera
            </button>
            {/* Rotate Camera */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                  <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                  <polyline points="3 21 3 16 8 16" />
                </svg>
              </div>
              <div>Rotate</div>
              <div>Camera</div>
            </button>
            {/* Gallery */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              Gallery
            </button>
            {/* Flash */}
            <button
              style={{
                border: "none",
                background: "none",
                color: C.textOnDark,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: isDesktop ? 12 : 9,
                minWidth: isDesktop ? 80 : 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: isDesktop ? 9 : 6,
                  color: C.greenLight,
                }}
              >
                <svg
                  width={isDesktop ? 32 : 24}
                  height={isDesktop ? 32 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
                </svg>
              </div>
              Flash
            </button>
          </div>
        </div>
      </Center>
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
    backTo="barcode"
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
          paddingTop: SAFE_TOP,
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
                padding: "4px 14px",
                borderRadius: 12,
                border: `1px solid ${
                  filter === option ? C.greenLight : "rgba(255,255,255,0.35)"
                }`,
                background:
                  filter === option ? "rgba(224,167,46,0.2)" : "transparent",
                color: filter === option ? C.greenLight : "rgba(255,255,255,0.65)",
                fontSize: 9,
                cursor: "pointer",
              }}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
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
                padding: "8px 9px",
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
                  width: 38,
                  height: 38,
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
        borderBottom: "1px solid rgba(224,167,46,0.18)",
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
          color: "#fff",
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
            color: C.textOnDark,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: 8,
            color: "rgba(255,255,255,0.48)",
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
    paddingTop: 12,
    paddingLeft: 12,
    paddingRight: 12,
    background: "#071A0F",
  }}
>
  <InfoHeader
    title="Help & FAQ"
    subtitle="Answers for a safer scan"
    go={go}
  />
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
            padding: "28px 22px 40px",
            boxSizing: "border-box",
          }}
        >
          {/* HERO SECTION */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "26px 26px",
              marginBottom: 30,
              borderRadius: 20,
              border: "1px solid rgba(224,167,46,0.30)",
              background:
                "linear-gradient(135deg, rgba(22,76,41,0.95), rgba(10,48,27,0.95))",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            {/* Decorative circle */}
            <div
              style={{
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: "50%",
                right: -55,
                top: -65,
                background: "rgba(224,167,46,0.08)",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 90,
                height: 90,
                borderRadius: "50%",
                right: 45,
                bottom: -55,
                background: "rgba(91,170,110,0.08)",
              }}
            />

            {/* Icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(224,167,46,0.15)",
                border: "1px solid rgba(224,167,46,0.25)",
                marginBottom: 16,
              }}
            >
              <i
                className="fa fa-question-circle"
                style={{
                  color: C.greenLight,
                  fontSize: 25,
                }}
              />
            </div>

            <p
              style={{
                margin: "0 0 6px",
                color: C.textOnDark,
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              How can we help?
            </p>

            <p
              style={{
                margin: 0,
                maxWidth: 560,
                color: "rgba(255,255,255,0.62)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Find quick answers about scanning products, understanding
              product scores, allergy alerts, and managing your preferences.
            </p>
          </div>

          {/* FAQ HEADER */}
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
                  color: C.textOnDark,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                Frequently asked questions
              </p>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "rgba(255,255,255,0.42)",
                  fontSize: 10,
                }}
              >
                Tap a question to view the answer
              </p>
            </div>

            <div
              style={{
                padding: "5px 9px",
                borderRadius: 20,
                background: "rgba(224,167,46,0.10)",
                color: C.greenLight,
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {FAQ_ITEMS.length} questions
            </div>
          </div>

          {/* FAQ LIST */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {FAQ_ITEMS.map((item, index) => {
              const open = openQuestion === index

              return (
                <div
                  key={item.question}
                  style={{
                    borderRadius: 16,
                    border: open
                      ? "1px solid rgba(224,167,46,0.45)"
                      : "1px solid rgba(224,167,46,0.20)",
                    background: open
                      ? "rgba(22,76,41,0.92)"
                      : "rgba(15,55,30,0.72)",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: open
                      ? "0 8px 24px rgba(0,0,0,0.16)"
                      : "none",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(open ? -1 : index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      gap: 13,
                      padding: "16px 17px",
                      border: "none",
                      background: "transparent",
                      color: C.textOnDark,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {/* Number */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 31,
                        height: 31,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: open
                          ? "rgba(224,167,46,0.16)"
                          : "rgba(255,255,255,0.05)",
                        color: open
                          ? C.greenLight
                          : "rgba(255,255,255,0.45)",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    {/* Question */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.question}
                    </span>

                    {/* Arrow */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 27,
                        height: 27,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: open
                          ? "rgba(224,167,46,0.13)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <i
                        className={`fa fa-angle-${open ? "up" : "down"}`}
                        style={{
                          color: C.greenLight,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </button>

                  {/* ANSWER */}
                  {open && (
                    <div
                      style={{
                        padding: "0 17px 18px 61px",
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          marginBottom: 13,
                          background: "rgba(255,255,255,0.07)",
                        }}
                      />

                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.62)",
                          fontSize: 11,
                          lineHeight: 1.7,
                        }}
                      >
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
              marginTop: 28,
              padding: "21px",
              borderRadius: 18,
              border: "1px solid rgba(91,170,110,0.18)",
              background: "rgba(7,35,19,0.85)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Support icon */}
              <div
                style={{
                  flexShrink: 0,
                  width: 43,
                  height: 43,
                  borderRadius: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(91,170,110,0.12)",
                }}
              >
                <i
                  className="fa fa-headphones"
                  style={{
                    color: C.greenLight,
                    fontSize: 19,
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: C.textOnDark,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Still need help?
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Our support team is here to help you.
                </p>
              </div>
            </div>

            {/* Email */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 16,
                padding: "11px 13px",
                borderRadius: 11,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <i
                className="fa fa-envelope"
                style={{
                  color: C.greenLight,
                  fontSize: 12,
                }}
              />

              <span
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 10,
                }}
              >
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
      text: "Complex ingredient names are translated into plain language.",
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
      {/* HEADER */}
      <div
        style={{
          paddingTop: 12,
          paddingLeft: 12,
          paddingRight: 12,
          background: "#071A0F",
        }}
      >
        <InfoHeader
          title="About Scanity"
          subtitle="Smarter choices. Safer food."
          go={go}
        />
      </div>

      {/* SCROLLABLE CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 30,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
            padding: "28px 22px 40px",
            boxSizing: "border-box",
          }}
        >
          {/* LOGO SECTION */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              width: "100%",
              marginBottom: 24,
            }}
          >
            <img
              src={logoImg}
              alt="Scanity logo"
              style={{
                width: 72,
                height: 58,
                objectFit: "contain",
                mixBlendMode: "screen",
                filter: "brightness(1.15) saturate(1.2)",
                marginBottom: 8,
              }}
            />

            <h3
              style={{
                margin: 0,
                color: C.textOnDark,
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textAlign: "center",
              }}
            >
              SCAN<span style={{ color: C.greenLight }}>ITY</span>
            </h3>

            <p
              style={{
                margin: "8px 0 0",
                color: C.greenLight,
                fontSize: 11,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Smarter choices. Safer food.
            </p>
          </div>

          {/* INTRODUCTION */}
          <div
            style={{
              padding: "18px 18px",
              marginBottom: 24,
              borderRadius: 16,
              border: "1px solid rgba(224,167,46,0.25)",
              background: "rgba(22,76,41,0.72)",
              boxShadow: "0 5px 18px rgba(0,0,0,0.15)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: C.textOnDark,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              About Scanity
            </p>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.62)",
                fontSize: 11,
                lineHeight: 1.65,
              }}
            >
              Scanity is designed to help you determine whether packaged food
              is personally safe and suitable for you.
            </p>
          </div>

          {/* FEATURES TITLE */}
          <div
            style={{
              marginBottom: 12,
              paddingLeft: 3,
            }}
          >
            <p
              style={{
                margin: 0,
                color: C.textOnDark,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              What Scanity can do
            </p>

            <p
              style={{
                margin: "4px 0 0",
                color: "rgba(255,255,255,0.42)",
                fontSize: 10,
              }}
            >
              Tools designed to make food choices easier
            </p>
          </div>

          {/* FEATURES */}
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
                style={{
                  padding: "16px",
                  borderRadius: 16,
                  border: "1px solid rgba(224,167,46,0.22)",
                  background: "rgba(15,55,30,0.78)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* ICON */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(91,170,110,0.10)",
                      border: "1px solid rgba(91,170,110,0.16)",
                    }}
                  >
                    <i
                      className={`fa ${feature.icon}`}
                      style={{
                        color: C.greenLight,
                        fontSize: 16,
                      }}
                    />
                  </div>

                  {/* FEATURE TEXT */}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        color: C.textOnDark,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {feature.title}
                    </p>

                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(255,255,255,0.52)",
                        fontSize: 10,
                        lineHeight: 1.55,
                      }}
                    >
                      {feature.text}
                    </p>
                  </div>

                  {/* FEATURE NUMBER */}
                  <span
                    style={{
                      alignSelf: "flex-start",
                      color: "rgba(255,255,255,0.22)",
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

          {/* BOTTOM DIVIDER */}
          <div
            style={{
              height: 1,
              margin: "28px 0 18px",
              background: "rgba(224,167,46,0.20)",
            }}
          />

          {/* FOOTER */}
          <div
            style={{
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: C.greenLight,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Your health. Your choice.
            </p>

            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(255,255,255,0.40)",
                fontSize: 9,
              }}
            >
              Scanity 
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LegalScreen({
  go,
  kind,
}: {
  go: (s: Screen) => void
  kind: "privacy" | "terms"
}) {
  const privacy = kind === "privacy"
  const sections = privacy
    ? [
        [
          "Information we use",
          "Scanity uses your profile preferences and product scan results to provide personalized food safety guidance.",
        ],
        [
          "How we protect your data",
          "Your information is used to support your Scanity experience and is handled with care. We do not sell your personal information.",
        ],
        [
          "Your choices",
          "You can update your profile preferences at any time or delete your account from Settings.",
        ],
      ]
    : [
        [
          "Using Scanity",
          "Scanity provides informational guidance about packaged food. Always review product labels and use your own judgment.",
        ],
        [
          "Personalized recommendations",
          "Recommendations are based on the allergies and health conditions saved in your profile. Keep them up to date.",
        ],
        [
          "Service updates",
          "Features and content may change as we improve the Scanity experience.",
        ],
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
      <InfoHeader
        title={privacy ? "Privacy Policy" : "Terms of Service"}
        subtitle={
          privacy ? "Your information and choices" : "Using Scanity responsibly"
        }
        go={go}
      />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Center maxWidth={640} style={{ padding: "18px 16px 24px" }}>
        <div
          style={{
            padding: "15px",
            marginBottom: 16,
            borderRadius: 13,
            border: "1px solid rgba(224,167,46,0.28)",
            background: "rgba(22,76,41,0.78)",
          }}
        >
          <i
            className={`fa ${privacy ? "fa-shield" : "fa-file-text-o"}`}
            style={{ color: C.greenLight, fontSize: 23, marginBottom: 8 }}
          />
          <p
            style={{
              margin: 0,
              color: C.textOnDark,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {privacy ? "Your privacy matters" : "A few important notes"}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              color: "rgba(255,255,255,0.55)",
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            {privacy
              ? "Here is how Scanity uses information to personalize your experience."
              : "Please read these guidelines before using Scanity."}
          </p>
        </div>
        <p
          style={{
            margin: "0 0 8px 2px",
            color: "rgba(255,255,255,0.55)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {privacy ? "Policy details" : "Terms details"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {sections.map(([title, text]) => (
            <section
              key={title}
              style={{
                padding: "14px",
                borderRadius: 13,
                border: "1px solid rgba(224,167,46,0.28)",
                background: "rgba(22,76,41,0.78)",
              }}
            >
              <p
                style={{
                  margin: "0 0 5px",
                  color: C.textOnDark,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {title}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.56)",
                  fontSize: 10,
                  lineHeight: 1.6,
                }}
              >
                {text}
              </p>
            </section>
          ))}
        </div>
        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,0.38)",
            fontSize: 9,
            textAlign: "center",
          }}
        >
          Last updated August 2026
        </p>
        </Center>
      </div>
    </div>
  )
}
// ── Settings Screen ───────────────────────────────────────────────────────────
function SettingsScreen({ go }: { go: (s: Screen) => void }) {
  const [notifications, setNotifications] = useState(true)
  const currentLanguage = "English"
  // ── Section Title ─────────────────────────────────────────────────────────
  const Section = ({ title }: { title: string }) => (
    <p
      style={{
        margin: "0 0 8px 2px",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)",
      }}
    >
      {title}
    </p>
  )
  // ── Chevron ───────────────────────────────────────────────────────────────
  const Chevron = () => (
    <i
      className="fa fa-angle-right"
      style={{
        fontSize: 18,
        color: "rgba(255,255,255,0.45)",
      }}
    />
  )
  // ── Settings Row ─────────────────────────────────────────────────────────
  const Row = ({
    icon,
    label,
    sub,
    right,
    onClick,
    danger = false,
  }: {
    icon: ReactNode
    label: string
    sub?: string
    right?: ReactNode
    onClick?: () => void
    danger?: boolean
  }) => {
    const Tag = onClick ? "button" : "div"
    return (
      <Tag
        {...(onClick ? { type: "button" as const, onClick } : {})}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 13px",
          marginBottom: 7,
          borderRadius: 13,
          border: danger
            ? "1px solid rgba(255,107,107,0.20)"
            : "1px solid rgba(224,167,46,0.28)",
          background: danger ? "rgba(45,24,24,0.72)" : "rgba(22,76,41,0.78)",
          boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
          boxSizing: "border-box",
          cursor: onClick ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        {/* ICON */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: danger
              ? "rgba(255,107,107,0.10)"
              : "rgba(224,167,46,0.14)",
            border: danger
              ? "1px solid rgba(255,107,107,0.20)"
              : "1px solid rgba(224,167,46,0.22)",
          }}
        >
          {icon}
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
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: danger ? "#FF8585" : C.textOnDark,
            }}
          >
            {label}
          </p>
          {sub && (
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "'Poppins', sans-serif",
                fontSize: 8,
                color: "rgba(255,255,255,0.52)",
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {/* RIGHT */}
        {right}
      </Tag>
    )
  }
  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#071A0F",
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
          opacity: 0.22,
          pointerEvents: "none",
        }}
      />
      {/* GREEN OVERLAY */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,24,13,0.92) 0%, rgba(6,35,18,0.88) 45%, rgba(5,25,13,0.96) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* ═══════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingTop: 13,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 13,
          borderBottom: "1px solid rgba(224,167,46,0.18)",
        }}
      >
        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={() => go("dashboard")}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.07)",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <i
            className="fa fa-angle-left"
            style={{
              fontSize: 20,
            }}
          />
        </button>
        {/* TITLE */}
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 17,
              color: C.textOnDark,
            }}
          >
            Settings
          </h2>
          <p
            style={{
              margin: "1px 0 0",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 8,
              color: "rgba(255,255,255,0.48)",
            }}
          >
            Customize your Scanity experience
          </p>
        </div>
      </div>
      {/* ═══════════════════════════════════════════
          CONTENT
      ═══════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <Center maxWidth={640} style={{ padding: "15px 20px 25px" }}>
        {/* ═══════════════════════════════════════════
            PREFERENCES
        ═══════════════════════════════════════════ */}
        <Section title="Preferences" />
        {/* Notifications */}
        <Row
          icon={
            <i
              className="fa fa-bell-o"
              style={{
                fontSize: 17,
                color: C.greenLight,
              }}
            />
          }
          label="Notifications"
          sub="Receive updates and reminders"
          right={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setNotifications(!notifications)
              }}
              style={{
                width: 42,
                height: 24,
                padding: 0,
                border: "none",
                borderRadius: 12,
                background: notifications
                  ? C.greenLight
                  : "rgba(255,255,255,0.20)",
                position: "relative",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: notifications ? 21 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  transition: "left 0.2s",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                }}
              />
            </button>
          }
        />
       
        {/* ═══════════════════════════════════════════
            SECURITY
        ═══════════════════════════════════════════ */}
        <div style={{ marginTop: 17 }}>
          <Section title="Security" />
        </div>
        {/* Change Password */}
        <Row
          onClick={() => go("forgotPassword")}
          icon={
            <i
              className="fa fa-key"
              style={{
                fontSize: 17,
                color: C.greenLight,
              }}
            />
          }
          label="Change Password"
          sub="Update your current password"
          right={<Chevron />}
        />
        {/* ═══════════════════════════════════════════
            SUPPORT & INFO
        ═══════════════════════════════════════════ */}
        <div style={{ marginTop: 17 }}>
          <Section title="Support & Info" />
        </div>
        {/* About */}
        <Row
          icon={
            <i
              className="fa fa-info-circle"
              style={{
                fontSize: 17,
                color: C.greenLight,
              }}
            />
          }
          onClick={() => go("about")}
          label="About Scanity"
          sub="Learn more about Scanity"
          right={<Chevron />}
        />
        {/* Privacy */}
        <Row
          icon={
            <i
              className="fa fa-shield"
              style={{
                fontSize: 16,
                color: C.greenLight,
              }}
            />
          }
          onClick={() => go("privacy")}
          label="Privacy Policy"
          right={<Chevron />}
        />
        {/* Terms */}
        <Row
          icon={
            <i
              className="fa fa-file-text-o"
              style={{
                fontSize: 16,
                color: C.greenLight,
              }}
            />
          }
          onClick={() => go("terms")}
          label="Terms of Service"
          right={<Chevron />}
        />
        {/* ═══════════════════════════════════════════
            ACCOUNT
        ═══════════════════════════════════════════ */}
        <div style={{ marginTop: 17 }}>
          <Section title="Account" />
        </div>
        {/* Delete Account */}
        <Row
          danger
          onClick={() => go("delete")}
          icon={
            <i
              className="fa fa-trash-o"
              style={{
                fontSize: 18,
                color: "#FF6B6B",
              }}
            />
          }
          label="Delete Account"
          sub="Permanently delete your account"
          right={
            <i
              className="fa fa-angle-right"
              style={{
                fontSize: 18,
                color: "rgba(255,107,107,0.55)",
              }}
            />
          }
        />
        {/* Bottom spacing */}
        <div style={{ height: 15 }} />
        </Center>
      </div>
    </div>
  )
}
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
// ── Forgot Password ─────────────────────────────────────────────────────────────────
function ForgotPasswordScreen({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState("")
  const [pressed, setPressed] = useState(false)
  const isDesktop = useIsDesktop()

  return (
    <div
      style={{
        flex: 1,
        minHeight: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#071B10",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── Background ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 15%, rgba(224,167,46,0.16), transparent 35%)," +
            "radial-gradient(circle at 85% 80%, rgba(201,138,31,0.13), transparent 35%)," +
            "linear-gradient(145deg, #071B10 0%, #0C2D19 50%, #102E1C 100%)",
        }}
      />
      {/* ── Decorative glow ── */}
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(224,167,46,0.08)",
          filter: "blur(35px)",
          top: -60,
          right: -50,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(224,167,46,0.06)",
          filter: "blur(30px)",
          bottom: -50,
          left: -50,
        }}
      />

      {/* Back Button — fixed to the viewport corner, not inside the centered card */}
      <button
        type="button"
        onClick={() => go("login")}
        style={{
          position: "absolute",
          top: isDesktop ? 32 : SAFE_TOP,
          left: isDesktop ? 32 : 18,
          zIndex: 3,
          width: 42,
          height: 42,
          borderRadius: 12,
          border: "1px solid rgba(224,167,46,0.30)",
          background: "rgba(255,255,255,0.08)",
          color: C.textOnDark,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          transition: "background 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.14)"
          e.currentTarget.style.transform = "translateX(-2px)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)"
          e.currentTarget.style.transform = "translateX(0)"
        }}
      >
        <i className="fa fa-angle-left" style={{ fontSize: 24 }} />
      </button>

      {/* ── Content — vertically + horizontally centered in the full viewport ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isDesktop ? "60px 24px" : "80px 18px 24px",
          boxSizing: "border-box",
        }}
      >
        <Center
          maxWidth={isDesktop ? 480 : 360}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: isDesktop ? "48px 44px" : "0",
            boxSizing: "border-box",
            ...(isDesktop
              ? {
                  background: "rgba(15, 48, 28, 0.55)",
                  border: "1px solid rgba(224,167,46,0.20)",
                  borderRadius: 28,
                  boxShadow:
                    "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }
              : {}),
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: isDesktop ? 96 : 88,
              height: isDesktop ? 96 : 88,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(224,167,46,0.12)",
              border: "1.5px solid rgba(224,167,46,0.45)",
              boxShadow:
                "0 0 30px rgba(224,167,46,0.10), inset 0 1px rgba(255,255,255,0.08)",
              marginBottom: 22,
              flexShrink: 0,
            }}
          >
            <i
              className="fa fa-unlock-alt"
              style={{
                fontSize: isDesktop ? 41 : 38,
                color: C.greenLight,
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: isDesktop ? 28 : 21,
              fontWeight: 800,
              color: C.textOnDark,
              textAlign: "center",
            }}
          >
            Forgot Password?
          </h1>

          {/* Description */}
          <p
            style={{
              margin: "0 0 30px",
              maxWidth: isDesktop ? 340 : 260,
              fontSize: isDesktop ? 13 : 10,
              lineHeight: isDesktop ? "20px" : "15px",
              color: "rgba(255,255,255,0.58)",
              textAlign: "center",
            }}
          >
            Enter your email and we'll send you a
            <br />
            code to reset your password.
          </p>

          {/* Email Label */}
          <div
            style={{
              width: "100%",
              maxWidth: isDesktop ? 380 : 300,
              marginBottom: 10,
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: isDesktop ? 12 : 10,
                fontWeight: 600,
                color: C.textOnDark,
              }}
            >
              Email Address
            </label>
            {/* Email Input */}
            <div
              style={{
                height: isDesktop ? 54 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 16px",
                boxSizing: "border-box",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: email
                  ? "1px solid rgba(224,167,46,0.75)"
                  : "1px solid rgba(255,255,255,0.14)",
                boxShadow: email ? "0 0 15px rgba(224,167,46,0.08)" : "none",
              }}
            >
              <i
                className="fa fa-envelope-o"
                style={{
                  fontSize: isDesktop ? 16 : 15,
                  color: C.greenLight,
                  flexShrink: 0,
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: C.textOnDark,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 13 : 11,
                }}
              />
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
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
              maxWidth: isDesktop ? 380 : 300,
              height: isDesktop ? 54 : 48,
              marginTop: 14,
              border: "1px solid rgba(224,167,46,0.55)",
              borderRadius: 14,
              background: pressed
                ? "#8B6F5A"
                : "linear-gradient(135deg, #E0A72E 0%, #C98A1F 100%)",
              color: "#FFFFFF",
              fontFamily: "'Poppins', sans-serif",
              fontSize: isDesktop ? 15 : 16,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: pressed
                ? "0 3px 10px rgba(0,0,0,0.25)"
                : "0 6px 20px rgba(224,167,46,0.22)",
              transform: pressed ? "scale(0.98)" : "scale(1)",
              transition: "all 0.12s ease",
            }}
          >
            Continue
          </button>

          {/* Back to Login */}
          <button
            type="button"
            onClick={() => go("login")}
            style={{
              marginTop: 22,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: isDesktop ? 12 : 10,
              cursor: "pointer",
            }}
          >
            Remember your password?{" "}
            <span
              style={{
                color: C.greenLight,
                fontWeight: 750,
              }}
            >
              Login
            </span>
          </button>

          {/* Footer */}
          <p
            style={{
              margin: isDesktop ? "32px 0 0" : "24px 0 0",
              textAlign: "center",
              fontSize: isDesktop ? 12 : 10,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Scanity • See It. Know It. Eat It.
          </p>
        </Center>
      </div>
    </div>
  )
}
// ── Reset Password Screen ─────────────────────────────────────────────────
function ResetPasswordScreen({ go }: { go: (s: Screen) => void }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pressed, setPressed] = useState(false)
  const isDesktop = useIsDesktop()
  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword

  return (
    <div
      style={{
        flex: 1,
        minHeight: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#071B10",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── Background ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 15%, rgba(224,167,46,0.16), transparent 35%)," +
            "radial-gradient(circle at 85% 80%, rgba(201,138,31,0.13), transparent 35%)," +
            "linear-gradient(145deg, #071B10 0%, #0C2D19 50%, #102E1C 100%)",
        }}
      />
      {/* ── Decorative glow ── */}
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(224,167,46,0.08)",
          filter: "blur(35px)",
          top: -60,
          right: -50,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(224,167,46,0.06)",
          filter: "blur(30px)",
          bottom: -50,
          left: -50,
        }}
      />

      {/* Back Button — fixed to the viewport corner, not inside the centered card */}
      <button
        type="button"
        onClick={() => go("forgotPassword")}
        style={{
          position: "absolute",
          top: isDesktop ? 32 : SAFE_TOP,
          left: isDesktop ? 32 : 18,
          zIndex: 3,
          width: 42,
          height: 42,
          borderRadius: 12,
          border: "1px solid rgba(224,167,46,0.30)",
          background: "rgba(255,255,255,0.08)",
          color: C.textOnDark,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          transition: "background 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.14)"
          e.currentTarget.style.transform = "translateX(-2px)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)"
          e.currentTarget.style.transform = "translateX(0)"
        }}
      >
        <i className="fa fa-angle-left" style={{ fontSize: 24 }} />
      </button>

      {/* ── Content — vertically + horizontally centered in the full viewport ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isDesktop ? "60px 24px" : "80px 18px 24px",
          boxSizing: "border-box",
        }}
      >
        <Center
          maxWidth={isDesktop ? 480 : 360}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: isDesktop ? "48px 44px" : "0",
            boxSizing: "border-box",
            ...(isDesktop
              ? {
                  background: "rgba(15, 48, 28, 0.55)",
                  border: "1px solid rgba(224,167,46,0.20)",
                  borderRadius: 28,
                  boxShadow:
                    "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }
              : {}),
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: isDesktop ? 96 : 88,
              height: isDesktop ? 96 : 88,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(224,167,46,0.12)",
              border: "1.5px solid rgba(224,167,46,0.45)",
              boxShadow:
                "0 0 30px rgba(224,167,46,0.10), inset 0 1px rgba(255,255,255,0.08)",
              marginBottom: 22,
              flexShrink: 0,
            }}
          >
            <i
              className="fa fa-lock"
              style={{
                fontSize: isDesktop ? 41 : 38,
                color: C.greenLight,
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: isDesktop ? 28 : 21,
              fontWeight: 800,
              color: C.textOnDark,
              textAlign: "center",
            }}
          >
            Reset Password
          </h1>

          {/* Description */}
          <p
            style={{
              margin: "0 0 30px",
              maxWidth: isDesktop ? 340 : 260,
              fontSize: isDesktop ? 13 : 10,
              lineHeight: isDesktop ? "20px" : "15px",
              color: "rgba(255,255,255,0.58)",
              textAlign: "center",
            }}
          >
            Create a new password for your account.
            <br />
            Make sure it is strong and secure.
          </p>

          {/* New Password */}
          <div
            style={{
              width: "100%",
              maxWidth: isDesktop ? 380 : 300,
              marginBottom: 14,
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: isDesktop ? 12 : 10,
                fontWeight: 600,
                color: C.textOnDark,
              }}
            >
              New Password
            </label>
            <div
              style={{
                height: isDesktop ? 54 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 16px",
                boxSizing: "border-box",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: password
                  ? "1px solid rgba(224,167,46,0.75)"
                  : "1px solid rgba(255,255,255,0.14)",
                boxShadow: password ? "0 0 15px rgba(224,167,46,0.08)" : "none",
              }}
            >
              <i
                className="fa fa-lock"
                style={{
                  fontSize: isDesktop ? 16 : 15,
                  color: C.greenLight,
                  flexShrink: 0,
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: C.textOnDark,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 13 : 11,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                <i
                  className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}
                  style={{ fontSize: isDesktop ? 15 : 14 }}
                />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div
            style={{
              width: "100%",
              maxWidth: isDesktop ? 380 : 300,
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: isDesktop ? 12 : 10,
                fontWeight: 600,
                color: C.textOnDark,
              }}
            >
              Confirm Password
            </label>
            <div
              style={{
                height: isDesktop ? 54 : 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 16px",
                boxSizing: "border-box",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: confirmPassword
                  ? passwordsMatch
                    ? "1px solid rgba(224,167,46,0.75)"
                    : "1px solid rgba(220,80,80,0.65)"
                  : "1px solid rgba(255,255,255,0.14)",
                boxShadow:
                  confirmPassword && passwordsMatch
                    ? "0 0 15px rgba(224,167,46,0.08)"
                    : "none",
              }}
            >
              <i
                className="fa fa-lock"
                style={{
                  fontSize: isDesktop ? 16 : 15,
                  color: C.greenLight,
                  flexShrink: 0,
                }}
              />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: C.textOnDark,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isDesktop ? 13 : 11,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                <i
                  className={showConfirm ? "fa fa-eye-slash" : "fa fa-eye"}
                  style={{ fontSize: isDesktop ? 15 : 14 }}
                />
              </button>
            </div>
            {/* Password Match */}
            {confirmPassword.length > 0 && (
              <p
                style={{
                  margin: "8px 0 0 4px",
                  fontSize: isDesktop ? 10 : 8,
                  color: passwordsMatch ? "#4CAF50" : "#D96C6C",
                }}
              >
                {passwordsMatch
                  ? "✓ Passwords match"
                  : "Passwords do not match"}
              </p>
            )}
          </div>

          {/* Continue Button */}
          <button
            type="button"
            disabled={!passwordsMatch}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onTouchStart={() => setPressed(true)}
            onTouchEnd={() => setPressed(false)}
            onClick={() => {
              if (passwordsMatch) {
                go("confirmationPassword")
              }
            }}
            style={{
              width: "100%",
              maxWidth: isDesktop ? 380 : 300,
              height: isDesktop ? 54 : 48,
              marginTop: 22,
              border: "1px solid rgba(224,167,46,0.55)",
              borderRadius: 14,
              background: !passwordsMatch
                ? "rgba(255,255,255,0.12)"
                : pressed
                  ? "#8B6F5A"
                  : "linear-gradient(135deg, #E0A72E 0%, #C98A1F 100%)",
              color: !passwordsMatch ? "rgba(255,255,255,0.35)" : "#FFFFFF",
              fontFamily: "'Poppins', sans-serif",
              fontSize: isDesktop ? 15 : 16,
              fontWeight: 700,
              cursor: !passwordsMatch ? "not-allowed" : "pointer",
              boxShadow: !passwordsMatch
                ? "none"
                : pressed
                  ? "0 3px 10px rgba(0,0,0,0.25)"
                  : "0 6px 20px rgba(224,167,46,0.22)",
              transform: pressed ? "scale(0.98)" : "scale(1)",
              transition: "all 0.12s ease",
            }}
          >
            Continue
          </button>

          {/* Footer */}
          <p
            style={{
              margin: isDesktop ? "32px 0 0" : "24px 0 0",
              textAlign: "center",
              fontSize: isDesktop ? 12 : 10,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Scanity • See It. Know It. Eat It.
          </p>
        </Center>
      </div>
    </div>
  )
}
// ── Confirmation Password ─────────────────────────────────────────────────────────────────
function ConfirmationPasswordScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div
      style={{
        flex: 1,
        background:
          "linear-gradient(180deg, #0A1F12 0%, #102E1A 55%, #0C2414 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "22px 20px",
        boxSizing: "border-box",
        color: C.textOnDark,
        fontFamily: "'Poppins', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(224,167,46,0.10)",
          filter: "blur(50px)",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      {/* Success Icon */}
      <div
        style={{
          width: 92,
          height: 92,
          marginTop: 110,
          borderRadius: "50%",
          background: C.greenLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 35px rgba(224,167,46,0.35)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <i
          className="fa fa-check"
          style={{
            fontSize: 48,
            color: "#FFFFFF",
          }}
        />
      </div>
      {/* Text */}
      <h2
        style={{
          margin: "24px 0 7px",
          textAlign: "center",
          fontSize: 25,
          fontWeight: 800,
          position: "relative",
          zIndex: 2,
        }}
      >
        Your password has been
        <br />
        reset successfully.
      </h2>
      <p
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.55)",
          position: "relative",
          zIndex: 2,
        }}
      >
        You can now login using your new password.
      </p>
      {/* Back to Login */}
      <Center
        maxWidth={460}
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          padding: "0 20px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => go("login")}
          style={{
            width: "100%",
            height: 60,
            border: "none",
            borderRadius: 12,
            background: C.greenLight,
            color: "#FFFFFF",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(224,167,46,0.22)",
          }}
        >
          Back to Login
        </button>
      </Center>
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