export default function PublicBookingLoading() {
  return (
    <section className="mx-auto flex min-h-72 max-w-xl items-center justify-center px-4 text-center">
      <div role="status">
        <span
          className="loading loading-spinner loading-lg text-primary"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-semibold">Carregando agendamento…</p>
      </div>
    </section>
  );
}
