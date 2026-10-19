import MobileHeader from '@/components/shared/MobileHeader'
import TabBar from '@/components/shared/TabBar'

export default function LoadingMobile() {
  return (
    <div className="pg m" style={{ position: "relative", minHeight: "100dvh", overflowX: "clip" }}>
      <MobileHeader />
      <div role="status" aria-busy="true" aria-label="Loading Today" style={{ padding: "16px", display: "grid", gap: "14px" }}>
        <div className="sk" style={{ height: "40px", width: "100%" }} />
        <div className="sk" style={{ height: "240px", width: "100%" }} />
        <div className="sk" style={{ height: "20px", width: "30%" }} />
        <div className="sk" style={{ height: "30px", width: "100%" }} />
        <div className="sk" style={{ height: "30px", width: "70%" }} />
        <div className="row" style={{ gap: "12px", alignItems: "flex-start" }}>
          <div style={{ flex: "1", display: "grid", gap: "8px" }}>
            <div className="sk" style={{ height: "16px", width: "30%" }} />
            <div className="sk" style={{ height: "16px", width: "100%" }} />
            <div className="sk" style={{ height: "16px", width: "60%" }} />
          </div>
          <div className="sk" style={{ height: "88px", width: "88px" }} />
        </div>
        <div className="row" style={{ gap: "12px", alignItems: "flex-start" }}>
          <div style={{ flex: "1", display: "grid", gap: "8px" }}>
            <div className="sk" style={{ height: "16px", width: "30%" }} />
            <div className="sk" style={{ height: "16px", width: "100%" }} />
            <div className="sk" style={{ height: "16px", width: "60%" }} />
          </div>
          <div className="sk" style={{ height: "88px", width: "88px" }} />
        </div>
        <div className="row" style={{ gap: "12px", alignItems: "flex-start" }}>
          <div style={{ flex: "1", display: "grid", gap: "8px" }}>
            <div className="sk" style={{ height: "16px", width: "30%" }} />
            <div className="sk" style={{ height: "16px", width: "100%" }} />
            <div className="sk" style={{ height: "16px", width: "60%" }} />
          </div>
          <div className="sk" style={{ height: "88px", width: "88px" }} />
        </div>
      </div>
      <TabBar active="today" />
    </div>
  )
}
