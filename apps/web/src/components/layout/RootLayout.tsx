import { Link, Outlet } from 'react-router-dom';

export function RootLayout() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
                <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-8">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">Questory</span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-semibold">
                            <Link to="/" className="transition-colors hover:text-indigo-600 text-slate-600">Home</Link>
                            <Link to="/create" className="transition-colors hover:text-indigo-600 text-slate-600">Create</Link>
                            <Link to="/library" className="transition-colors hover:text-indigo-600 text-slate-600">Library</Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
        </div>
    );
}
