import SubmitForm from "../components/SubmitForm.tsx";
import { EventsList } from "../components/EventsList.tsx";

export function DefaultView() {
  return (
    <>
      <div className="container mx-auto mt-6">
        <h1 className="text-3xl mb-2">Submit Events</h1>
        <SubmitForm />
      </div>
      <div className="mt-6">
        <h1 className="text-3xl mb-2">Existing Events</h1>
        <EventsList />
      </div>
    </>
  );
}
