export default function SystemDesktop() {
  return (
    <div className="pg" style={{ position: "relative", minHeight: "100vh" }}>
      <div style={{ padding: "48px", display: "grid", gap: "24px" }}>
        <div>
          <h1 style={{ margin: "0", font: "700 36px/1.1 Inter", letterSpacing: "-.02em" }}>News APP Reader design system</h1>
          <p className="mf" style={{ margin: "8px 0 0", fontSize: "16px", maxWidth: "80ch" }}>
            Built on the shadcn-style Blue theme: neutral zinc surfaces, a blue primary, Inter for interface text, Lora for reading, 10px controls and 14px cards. OKLCH values are approximated in sRGB. Primary text and fills use #2563EB so white-on-blue and blue-on-white stay above 4.5:1.
          </p>
        </div>
        <section className="card">
          <div className="ch">
            <h2>Colour</h2>
            <p>Light theme tokens</p>
          </div>
          <div style={{ margin: "0 24px 8px" }}>
            <p className="mf sm" style={{ margin: "0 0 8px" }}>Light</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: "12px" }}>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#FFFFFF" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Background</b>
                <span className="mf sm">#FFFFFF</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#09090B" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Foreground</b>
                <span className="mf sm">#09090B</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#FFFFFF" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Card</b>
                <span className="mf sm">#FFFFFF</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#F4F4F5" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Muted</b>
                <span className="mf sm">#F4F4F5</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#71717A" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Muted text</b>
                <span className="mf sm">#71717A</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#E4E4E7" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Border</b>
                <span className="mf sm">#E4E4E7</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#2563EB" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Primary</b>
                <span className="mf sm">#2563EB</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#2563EB" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Primary text</b>
                <span className="mf sm">#2563EB</span>
              </div>
              <div>
                <div style={{ height: "64px", borderRadius: "10px", border: "1px solid var(--bd)", background: "#EFF6FF" }} />
                <b className="sm" style={{ display: "block", marginTop: "6px" }}>Primary tint</b>
                <span className="mf sm">#EFF6FF</span>
              </div>
            </div>
          </div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <section className="card">
            <div className="ch">
              <h2>Type</h2>
              <p>Inter and Lora</p>
            </div>
            <div style={{ padding: "0 24px 24px", display: "grid", gap: "10px" }}>
              <div className="ser" style={{ font: "600 36px/1.15 Lora" }}>Headline, Lora 600 / 36</div>
              <div style={{ font: "600 22px Inter", letterSpacing: "-.02em" }}>Card title, Inter 600 / 22</div>
              <div className="ht">Story title, Inter 600 / 17</div>
              <div style={{ fontSize: "14px" }}>Body, Inter 400 / 14</div>
              <div className="mf sm">Meta, Inter 400 / 13</div>
            </div>
          </section>
          <section className="card">
            <div className="ch">
              <h2>Components</h2>
              <p>Radius, buttons, pills, rows</p>
            </div>
            <div style={{ padding: "0 24px 24px", display: "grid", gap: "16px" }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button className="btn p">Primary</button>
                <button className="btn">Outline</button>
                <button className="ib" aria-label="Icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 3h12v18l-6-4-6 4z" />
                  </svg>
                </button>
                <span className="pill">Tag</span>
                <span className="pill" style={{ background: "var(--pr)", borderColor: "var(--pr)", color: "var(--prf)" }}>Active</span>
                <span className="cnt">24</span>
                <span className="num">1</span>
              </div>
              <div className="card">
                <a href="#" className="lr" style={{ padding: "14px 18px" }}>
                  <span className="mf" style={{  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
                    </svg>
                  </span>
                  <span style={{ flex: "1" }}>
                    <b style={{ fontWeight: "600", display: "block" }}>Technology</b>
                    <span className="mf sm">List row with count</span>
                  </span>
                  <span className="cnt">12</span>
                  <span className="mf">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </a>
                <a href="#" className="lr" style={{ padding: "14px 18px", background: "var(--soft)" }}>
                  <span className="mf" style={{ color: "var(--pt)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
                    </svg>
                  </span>
                  <span style={{ flex: "1" }}>
                    <b style={{ fontWeight: "600", display: "block", color: "var(--pt)" }}>Tech (active)</b>
                    <span className="mf sm">Active row uses the primary tint</span>
                  </span>
                  <span className="cnt">12</span>
                  <span className="mf">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
