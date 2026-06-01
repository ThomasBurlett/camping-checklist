import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/auth/auth-context";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { ChecklistPage } from "@/pages/ChecklistPage";

const remoteStorage = vi.hoisted(() => ({
  loadRemoteChecklistState: vi.fn(),
  saveRemoteChecklistState: vi.fn(),
}));

vi.mock("@heroui/react", async () => {
  const React = await import("react");
  type ElementProps = React.HTMLAttributes<HTMLElement> & {
    children?: React.ReactNode;
    className?: string;
  };
  type ButtonProps = ElementProps & {
    isIconOnly?: boolean;
    onPress?: () => void;
    size?: string;
    type?: "button" | "submit" | "reset";
    variant?: string;
  };
  type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    fullWidth?: boolean;
    variant?: string;
  };

  function makeElement(tag: keyof React.JSX.IntrinsicElements) {
    return function Component({ children, ...props }: ElementProps) {
      return React.createElement(tag, props, children);
    };
  }

  function Button({ children, isIconOnly, onPress, size, variant, ...props }: ButtonProps) {
    void isIconOnly;
    void size;
    void variant;

    return (
      <button {...props} onClick={onPress} type={props.type ?? "button"}>
        {children}
      </button>
    );
  }

  function Checkbox({
    children,
    className,
    id,
    isSelected,
    onChange,
  }: ElementProps & {
    id?: string;
    isSelected?: boolean;
    onChange?: (isSelected: boolean) => void;
  }) {
    return (
      <label className={className}>
        <input
          checked={Boolean(isSelected)}
          id={id}
          onChange={() => onChange?.(!isSelected)}
          type="checkbox"
        />
        {children}
      </label>
    );
  }

  Checkbox.Control = makeElement("span");
  Checkbox.Indicator = makeElement("span");
  Checkbox.Content = makeElement("span");

  function Input({ fullWidth, variant, ...props }: InputProps) {
    void fullWidth;
    void variant;

    return <input {...props} />;
  }

  function Link({ children, href, ...props }: ElementProps & { href?: string }) {
    return (
      <a {...props} href={href}>
        {children}
      </a>
    );
  }

  function Modal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  Modal.Backdrop = function Backdrop({
    children,
    isOpen,
  }: ElementProps & { isOpen?: boolean }) {
    return isOpen ? <div>{children}</div> : null;
  };
  Modal.Body = makeElement("div");
  Modal.Container = makeElement("div");
  Modal.Dialog = makeElement("div");
  Modal.Footer = makeElement("footer");
  Modal.Header = makeElement("header");
  Modal.Heading = makeElement("h2");

  function ProgressBar({ children, value, ...props }: ElementProps & { value?: number }) {
    return (
      <div {...props} role="progressbar" aria-valuenow={value}>
        {children}
      </div>
    );
  }

  ProgressBar.Fill = makeElement("span");
  ProgressBar.Track = makeElement("span");

  function Card({ children, ...props }: ElementProps) {
    return <div {...props}>{children}</div>;
  }

  Card.Content = makeElement("div");
  Card.Description = makeElement("p");
  Card.Footer = makeElement("footer");
  Card.Header = makeElement("header");
  Card.Title = makeElement("h3");

  return {
    Button,
    Card,
    Checkbox,
    Chip: makeElement("span"),
    Input,
    Label: makeElement("label"),
    Link,
    Modal,
    ProgressBar,
  };
});

vi.mock("@/lib/remote-checklist-storage", () => remoteStorage);

vi.mock("@/lib/confetti", () => ({
  fireCompletionConfetti: vi.fn(),
  fireItemConfetti: vi.fn(),
  getViewportOrigin: vi.fn(() => ({ x: 0.5, y: 0.5 })),
}));

function renderChecklistPage(slug = "travel-1-day") {
  const authValue: AuthContextValue = {
    authError: "",
    isAnonymous: false,
    isConfigured: true,
    isLoading: false,
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
    startAnonymousSession: vi.fn(),
    syncVersion: 0,
    updateProfileName: vi.fn(),
    user: {
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
      id: "user-1",
      is_anonymous: false,
      user_metadata: {},
    },
  };

  return render(
    <ToastProvider>
      <AuthContext.Provider value={authValue}>
        <ChecklistPage slug={slug} />
      </AuthContext.Provider>
    </ToastProvider>,
  );
}

describe("ChecklistPage", () => {
  beforeEach(() => {
    remoteStorage.loadRemoteChecklistState.mockResolvedValue(null);
    remoteStorage.saveRemoteChecklistState.mockResolvedValue(undefined);
  });

  it("loads saved progress and updates packing progress when an item is checked", async () => {
    remoteStorage.loadRemoteChecklistState.mockResolvedValue({
      checkedIds: ["wallet"],
      collapsedSections: [],
      customItems: {},
    });

    renderChecklistPage();

    expect(await screen.findByText("Wallet with card and cash")).toBeInTheDocument();
    expect(screen.getByText("1/35 packed")).toBeInTheDocument();

    await userEvent.click(screen.getByText("ID or license"));

    await waitFor(() => {
      expect(screen.getByText("2/35 packed")).toBeInTheDocument();
    });
  });

  it("filters the checklist to optional items", async () => {
    renderChecklistPage();

    expect(await screen.findByText("Wallet with card and cash")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Optional" }));

    expect(screen.queryByText("Wallet with card and cash")).not.toBeInTheDocument();
    expect(screen.getByText("Tickets, reservations or digital confirmations")).toBeInTheDocument();
  });

  it("adds a custom optional item to the active section", async () => {
    const user = userEvent.setup();
    renderChecklistPage();

    expect(await screen.findByText("Backpack, sling or shoulder bag")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);
    await user.type(screen.getByLabelText("Item name"), "Printed itinerary");
    await user.selectOptions(screen.getByLabelText("Priority"), "optional");
    await user.click(screen.getByRole("button", { name: "Save item" }));

    expect(await screen.findByText("Printed itinerary")).toBeInTheDocument();
    expect(screen.getByText("0/36 packed")).toBeInTheDocument();
  });
});
