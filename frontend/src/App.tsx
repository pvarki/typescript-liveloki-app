import SubmitForm from "./components/SubmitForm.tsx";
import { EventsList } from "./components/EventsList.tsx";

export default function App() {
  return (
    <>
      <header className="bg-blue-700 p-4 text-xl flex">
        <div className="container mx-auto">LiveLoki</div>
      </header>
      <div className="overflow-y-auto inline-block grow">
        <main className="container mx-auto flex flex-col gap-4 my-2">
          <div>
            <h1 className="text-3xl mb-2">Submit Events</h1>
            <SubmitForm />
          </div>
          <div>
            <h1 className="text-3xl mb-2">Existing Events</h1>
            <EventsList />
          </div>
        </main>
      </div>
    </>
  );
}
