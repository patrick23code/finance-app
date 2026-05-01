import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-svh finance-dashboard-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-10">
          <div className="w-20 h-20 bg-white/90 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-lg border border-[#E9E3F3] overflow-hidden" style={{ boxShadow: '0 12px 28px -6px rgba(99,102,241,0.5)' }}>
            <img
              src="/captain_balance_logo_icon.png"
              alt="Captain Balance"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#24143F] tracking-tight mb-2">Captain Balance</h1>
          <p className="text-[#7F7198] text-sm">Track your debts, stay on top of payments</p>
        </div>

        <button
          onClick={login}
          className="w-full bg-white/90 border border-[#E9E3F3] text-[#24143F] rounded-2xl py-4 font-semibold text-[15px] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-[#7F7198] text-xs mt-6">Your data is securely stored and synced across devices</p>
      </div>
    </div>
  )
}
