import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";

function ToastTrigger({ message = "Test toast", kind }: { message?: string; kind?: "info" | "success" | "error" }) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, kind)}>Trigger</button>;
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("ToastContext", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders nothing when no toasts", () => {
    renderWithProvider(<div>App</div>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a toast with the given message", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => {
      screen.getByText("Trigger").click();
    });
    expect(screen.getByText("Test toast")).toBeInTheDocument();
  });

  it("applies info class by default", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Test toast").closest(".toast")).toHaveClass("toast-info");
  });

  it("applies success class", () => {
    renderWithProvider(<ToastTrigger kind="success" message="Saved" />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Saved").closest(".toast")).toHaveClass("toast-success");
  });

  it("applies error class", () => {
    renderWithProvider(<ToastTrigger kind="error" message="Failed" />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Failed").closest(".toast")).toHaveClass("toast-error");
  });

  it("auto-dismisses after 3500ms", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Test toast")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText("Test toast")).not.toBeInTheDocument();
  });

  it("dismisses on close button click", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Test toast")).toBeInTheDocument();

    act(() => { screen.getByLabelText("Dismiss").click(); });
    expect(screen.queryByText("Test toast")).not.toBeInTheDocument();
  });

  it("has accessible role=status container", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("shows multiple toasts simultaneously", () => {
    renderWithProvider(
      <>
        <ToastTrigger message="Toast 1" />
        <ToastTrigger message="Toast 2" />
      </>,
    );
    const triggers = screen.getAllByText("Trigger");
    act(() => { triggers[0].click(); });
    act(() => { triggers[1].click(); });
    expect(screen.getByText("Toast 1")).toBeInTheDocument();
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
  });

  it("manual dismiss clears timer and does not double-remove", () => {
    renderWithProvider(<ToastTrigger />);
    act(() => { screen.getByText("Trigger").click(); });
    expect(screen.getByText("Test toast")).toBeInTheDocument();

    // Dismiss manually before auto-expiry
    act(() => { screen.getByLabelText("Dismiss").click(); });
    expect(screen.queryByText("Test toast")).not.toBeInTheDocument();

    // Advance past auto-dismiss time — should not throw or re-add
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText("Test toast")).not.toBeInTheDocument();
  });

  it("throws when useToast is used outside provider", () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow("useToast must be used within a ToastProvider");
  });
});
