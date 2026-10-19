import DeskRail from '@/components/shared/DeskRail'
import SiteHeader from '@/components/shared/SiteHeader'

export default function LoadingDesktop() {
  return (
    <div className="pg" style={{ minHeight: "100%" }}>
      <SiteHeader active="today" />
      <div className="with-rail" style={{ maxWidth: "1320px", margin: "auto", padding: "24px 40px 80px", display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: "24px" }}>
        <DeskRail />
        <main style={{ display: "grid", gap: "24px", alignContent: "start", minWidth: "0" }}>
          <div role="status" aria-busy="true" aria-label="Loading Today" style={{ display: "grid", gap: "24px" }}>
            <div>
              <div className="sk" style={{ height: "30px", width: "160px" }} />
              <div style={{ height: "8px" }} />
              <div className="sk" style={{ height: "16px", width: "240px" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: "16px" }}>
              <div className="card" style={{ gridColumn: "1/8", gridRow: "1/3", padding: "16px", display: "grid", gap: "14px", alignContent: "start" }}>
                <div className="sk" style={{ height: "300px", width: "100%" }} />
                <div className="sk" style={{ height: "20px", width: "30%" }} />
                <div className="sk" style={{ height: "34px", width: "100%" }} />
                <div className="sk" style={{ height: "34px", width: "80%" }} />
              </div>
              <div className="card" style={{ padding: "20px", display: "grid", gap: "12px", alignContent: "start", gridColumn: "8/13" }}>
                <div className="sk" style={{ height: "120px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "70%" }} />
              </div>
              <div className="card" style={{ padding: "20px", display: "grid", gap: "12px", alignContent: "start", gridColumn: "8/13" }}>
                <div className="sk" style={{ height: "120px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "70%" }} />
              </div>
              <div className="card" style={{ padding: "20px", display: "grid", gap: "12px", alignContent: "start", gridColumn: "1/5" }}>
                <div className="sk" style={{ height: "120px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "70%" }} />
              </div>
              <div className="card" style={{ padding: "20px", display: "grid", gap: "12px", alignContent: "start", gridColumn: "5/9" }}>
                <div className="sk" style={{ height: "120px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "70%" }} />
              </div>
              <div className="card" style={{ padding: "20px", display: "grid", gap: "12px", alignContent: "start", gridColumn: "9/13" }}>
                <div className="sk" style={{ height: "120px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "100%" }} />
                <div className="sk" style={{ height: "16px", width: "70%" }} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
