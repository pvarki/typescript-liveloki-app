import { Link, Outlet } from "react-router-dom";
import Footer from "../footer"; // Import the Footer component

export function Root() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-700 p-4 text-xl flex">
        <div className="container mx-auto">
          <Link to="/">LiveLoki</Link>
        </div>
      </header>
      <main className="overflow-y-auto grow px-2">
        <Outlet /> {/* This renders child components */}
      </main>
      <Footer /> {/* Add Footer here */}
    </div>
  );
}
