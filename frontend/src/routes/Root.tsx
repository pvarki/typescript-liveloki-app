import { Link, Outlet } from "react-router-dom";

export function Root() {
  return (
    <>
      <header className="bg-blue-700 p-4 text-xl flex">
        <div className="container mx-auto">
          <Link to="/">LiveLoki</Link>
        </div>
      </header>
      <div className="overflow-y-auto inline-block grow px-2">
        <Outlet />
      </div>
    </>
  );
}
