import SubmitForm from "./components/SubmitForm.tsx";
import { EventsList } from "./components/EventsList.tsx";

export default function App() {
  return (
    <>
      <header className="mdl-layout__header">
        <div className="mdl-layout__header-row">
          <span className="mdl-layout-title">LiveLoki</span>
          <div className="mdl-layout-spacer"></div>
        </div>
      </header>
      <main className="mdl-layout__content">
        <div className="page-content">
          <h1>Submit Events</h1>
          <SubmitForm />

          <h2>Existing Events</h2>
          <EventsList />
        </div>
      </main>
    </>
  );
}
