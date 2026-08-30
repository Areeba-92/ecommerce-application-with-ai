"use client";

export default function NewsletterForm() {
  return (
    <form
      className="newsletter__form"
      onSubmit={(e) => e.preventDefault()}
    >
      <input type="email" placeholder="Your email address" required />
      <button type="submit" aria-label="Subscribe">
        Sign Up
      </button>
    </form>
  );
}
