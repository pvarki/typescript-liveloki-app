import { Link, Outlet } from "react-router-dom";
import { MdFeedback } from "react-icons/md";

export function Root() {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <header className="bg-blue-700 p-4 text-xl flex">
          <div className="container mx-auto">
            <Link to="/">LiveLoki</Link>
          </div>
        </header>
        <main className="overflow-y-auto grow px-2">
          <Outlet /> {/* This renders child components */}
        </main>
      </div>
      <a
        href="https://docs.google.com/forms/d/1Awp-xcvc1-22xQlTTgwKFoGz8G3-VD6YmBKXmnxtI3g/viewform?edit_requested=true"
        target="_blank"
        rel="noopener noreferrer"
        className="ll-btn fixed text-sm bottom-4 right-8"
      >
        <MdFeedback className="inline mr-1" />
        Anna palautetta
      </a>
    </>
  );
}
