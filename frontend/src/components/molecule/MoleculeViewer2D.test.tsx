import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MoleculeViewer2D } from "./MoleculeViewer2D";
import type { MoleculeStructure } from "../../types/chemistry";

describe("MoleculeViewer2D Bond Tooltip", () => {
  it("renders bond length and bond angle on bond hover for H2O2", () => {
    const h2o2Structure: MoleculeStructure = {
      curated: true,
      atoms: [
        { atomIndex: 0, element: "O", x2d: -20, y2d: 0, x3d: -0.441, y3d: -0.669, z3d: -0.345 },
        { atomIndex: 1, element: "O", x2d: 20, y2d: 0, x3d: -0.411, y3d: 0.767, z3d: 0.014 },
        { atomIndex: 2, element: "H", x2d: -40, y2d: -30, x3d: 0.406, y3d: -1.036, z3d: -0.081 },
        { atomIndex: 3, element: "H", x2d: 40, y2d: 30, x3d: 0.446, y3d: 0.938, z3d: 0.412 },
      ],
      bonds: [
        {
          atomIndex1: 0,
          atomIndex2: 1,
          order: 1,
          type: "covalent",
          length: 1.48,
          angle: 106.6,
          angleLabel: "H–O–O",
        },
        {
          atomIndex1: 0,
          atomIndex2: 2,
          order: 1,
          type: "covalent",
          length: 0.96,
          angle: 106.6,
          angleLabel: "O–O–H",
        },
        {
          atomIndex1: 1,
          atomIndex2: 3,
          order: 1,
          type: "covalent",
          length: 0.96,
          angle: 106.6,
          angleLabel: "O–O–H",
        },
      ],
    };

    const { container } = render(<MoleculeViewer2D structure={h2o2Structure} label="Hydrogen Peroxide" />);

    // Find the O-O bond hit area
    const bondGroups = container.querySelectorAll(".molecule-2d__bond-group");
    expect(bondGroups.length).toBe(3);

    // Hover over the first bond (O-O bond)
    fireEvent.mouseEnter(bondGroups[0]!);

    // Verify Tooltip content
    expect(screen.getByText("Single Covalent Bond")).toBeDefined();
    expect(screen.getByText("O ↔ O")).toBeDefined();
    expect(screen.getByText("Bond Order:")).toBeDefined();
    expect(screen.getByText("Bond Length:")).toBeDefined();
    expect(screen.getByText("1.48 Å (148 pm)")).toBeDefined();
    expect(screen.getByText("Bond Angle:")).toBeDefined();
    expect(screen.getByText("106.6° (H–O–O)")).toBeDefined();
  });

  it("dynamically calculates bond length and angle if not pre-populated", () => {
    const waterStructure: MoleculeStructure = {
      curated: false,
      atoms: [
        { atomIndex: 0, element: "O", x2d: 0, y2d: -10, x3d: 0, y3d: 0.12, z3d: 0 },
        { atomIndex: 1, element: "H", x2d: -25, y2d: 20, x3d: -0.76, y3d: -0.47, z3d: 0 },
        { atomIndex: 2, element: "H", x2d: 25, y2d: 20, x3d: 0.76, y3d: -0.47, z3d: 0 },
      ],
      bonds: [
        {
          atomIndex1: 0,
          atomIndex2: 1,
          order: 1,
          type: "covalent",
        },
        {
          atomIndex1: 0,
          atomIndex2: 2,
          order: 1,
          type: "covalent",
        },
      ],
    };

    const { container } = render(<MoleculeViewer2D structure={waterStructure} label="Water" />);
    const bondGroups = container.querySelectorAll(".molecule-2d__bond-group");

    // Hover bond 0
    fireEvent.mouseEnter(bondGroups[0]!);

    expect(screen.getByText("Connects:")).toBeDefined();
    expect(screen.getByText("O ↔ H")).toBeDefined();
    expect(screen.getByText("Bond Length:")).toBeDefined();
    expect(screen.getByText("0.96 Å (96 pm)")).toBeDefined();
    expect(screen.getByText("Bond Angle:")).toBeDefined();
    expect(screen.getByText(/H–O–H/)).toBeDefined();
  });

  it("handles diatomic or linear molecules with 180° fallback without error", () => {
    const n2Structure: MoleculeStructure = {
      curated: false,
      atoms: [
        { atomIndex: 0, element: "N", x2d: -15, y2d: 0, x3d: -0.55, y3d: 0, z3d: 0 },
        { atomIndex: 1, element: "N", x2d: 15, y2d: 0, x3d: 0.55, y3d: 0, z3d: 0 },
      ],
      bonds: [
        { atomIndex1: 0, atomIndex2: 1, order: 3, type: "covalent" },
      ],
    };

    const { container } = render(<MoleculeViewer2D structure={n2Structure} label="Dinitrogen" />);
    const bondGroups = container.querySelectorAll(".molecule-2d__bond-group");
    expect(bondGroups.length).toBe(1);

    fireEvent.mouseEnter(bondGroups[0]!);
    expect(screen.getByText("Triple Covalent Bond")).toBeDefined();
    expect(screen.getByText("N ↔ N")).toBeDefined();
    expect(screen.getByText("1.10 Å (110 pm)")).toBeDefined();
    expect(screen.getByText("180.0° (linear)")).toBeDefined();
  });

  it("safely guards against degenerate or NaN coordinates with zero rendering errors", () => {
    const degenerateStructure: MoleculeStructure = {
      curated: false,
      atoms: [
        { atomIndex: 0, element: "C", x2d: 0, y2d: 0, x3d: 0, y3d: 0, z3d: 0 },
        { atomIndex: 1, element: "O", x2d: 0, y2d: 0, x3d: 0, y3d: 0, z3d: 0 },
      ],
      bonds: [
        { atomIndex1: 0, atomIndex2: 1, order: 2, type: "covalent" },
      ],
    };

    const { container } = render(<MoleculeViewer2D structure={degenerateStructure} label="Degenerate" />);
    const bondGroups = container.querySelectorAll(".molecule-2d__bond-group");
    fireEvent.mouseEnter(bondGroups[0]!);

    // Should fall back to standard table or covalent radii, never NaN
    expect(screen.getByText("Double Covalent Bond")).toBeDefined();
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText("1.22 Å (122 pm)")).toBeDefined();
    expect(screen.getByText("180.0° (linear)")).toBeDefined();
  });
});

