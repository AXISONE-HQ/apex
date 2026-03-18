"use client";

import { EvaluationBlock } from "@/types/domain";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDifficultyLabel, getScoringMethodLabel } from "@/lib/evaluation-format";

interface BlockTableProps {
  blocks: EvaluationBlock[];
  onEdit: (block: EvaluationBlock) => void;
  onSelect: (block: EvaluationBlock) => void;
}

export function BlockTable({ blocks, onEdit, onSelect }: BlockTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-navy-200)] bg-white shadow-sm">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Sport</TableHeaderCell>
            <TableHeaderCell>Difficulty</TableHeaderCell>
            <TableHeaderCell>Scoring</TableHeaderCell>
            <TableHeaderCell>Creator</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {blocks.map((block) => (
            <TableRow
              key={block.id}
              className="cursor-pointer transition hover:bg-[var(--color-navy-50)]"
              onClick={() => onSelect(block)}
            >
              <TableCell>
                <p className="font-semibold text-[var(--color-navy-900)]">{block.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {block.categories.map((category) => (
                    <Badge key={category} variant="info">
                      {category.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{block.sport}</TableCell>
              <TableCell>
                <Badge>{getDifficultyLabel(block.difficulty ?? null)}</Badge>
              </TableCell>
              <TableCell>{getScoringMethodLabel(block.scoringMethod)}</TableCell>
              <TableCell className="capitalize">{block.createdByType ?? "club"}</TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(block);
                  }}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
