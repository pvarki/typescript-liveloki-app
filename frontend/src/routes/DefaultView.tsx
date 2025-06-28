import { EventsList } from "../components/EventsList.tsx";
import { GroupManager } from "../components/GroupManager.tsx";
import SubmitForm from "../components/SubmitForm.tsx";

export function DefaultView() {
  return (
    <>
      <div className="lg:container mx-auto mt-2">
        <h1 className="text-xl mb-2">Submit Events</h1>
        <SubmitForm />
      </div>
      <div className="mt-4">
        <hr className="mb-4" />
        <h1 className="text-xl mb-2">Event Groups</h1>
        <GroupManager />
      </div>
      <div className="mt-4">
        <hr className="mb-4" />
        <EventsList />
      </div>
    </>
  );
}
