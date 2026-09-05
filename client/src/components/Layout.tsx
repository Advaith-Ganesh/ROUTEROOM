import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-100/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-ink-900">
            RouteRoom
          </Link>
          {user && (
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <span>{user.name}</span>
              <button
                onClick={() => {
                  void logout().then(() => navigate('/login'));
                }}
                className="rounded-md border border-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-100/60"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
