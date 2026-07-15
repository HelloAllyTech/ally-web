import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  DataTable,
  IconButton,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { useDeleteRoleplaySpecMutation, useGetRoleplaySpecsQuery } from "@api";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { RoleplaySpecListItem } from "@src/types/roleplayStudio";
import { formatCapitalizedEnum, formatDate } from "@utils";

/** Maps a roleplay spec status to a Carbon Tag colour. */
const STATUS_TAG_TYPE: Record<string, "green" | "blue" | "gray"> = {
  ACTIVE: "green",
  DRAFT: "blue",
  ARCHIVED: "gray",
};

/**
 * Roleplay Studio v2 landing list. Follows the Simulation Studio list pattern
 * (header + create action + table); rows open the workspace.
 */
export const RoleplayStudioList: React.FC = () => {
  const strings = en.roleplayStudio;
  const navigate = useNavigate();
  const { data, isLoading } = useGetRoleplaySpecsQuery();
  const [deleteSpec] = useDeleteRoleplaySpecMutation();
  const [specToDelete, setSpecToDelete] = useState<RoleplaySpecListItem | null>(null);

  const specs = data?.data ?? [];

  const openSpec = (spec: RoleplaySpecListItem) => navigate(ROUTES.ROLEPLAY_STUDIO_SPEC(spec.id));

  const handleConfirmDelete = async () => {
    if (!specToDelete) return;
    try {
      await deleteSpec(specToDelete.id).unwrap();
    } catch {
      toast.error(strings.deleteFailed);
    } finally {
      setSpecToDelete(null);
    }
  };

  const headers = [
    { key: "title", header: strings.columns.title },
    { key: "status", header: strings.columns.status },
    { key: "updatedAt", header: strings.columns.updatedAt },
    { key: "actions", header: strings.columns.actions },
  ];

  // Carbon DataTable consumes primitive cell values; keep the source spec keyed
  // by id so row-click / row actions still operate on the full list item.
  const specById = new Map(specs.map(spec => [spec.id, spec]));
  const rows = specs.map(spec => ({
    id: spec.id,
    title: spec.title || strings.untitledRoleplay,
    status: spec.status,
    updatedAt: spec.updatedAt,
    actions: "",
  }));

  const renderCell = (cellId: string, headerKey: string, value: string, spec?: RoleplaySpecListItem) => {
    switch (headerKey) {
      case "title":
        return (
          <TableCell key={cellId}>
            <span className="text-base text-typography-900 font-medium">{value}</span>
          </TableCell>
        );
      case "status": {
        const tagType = STATUS_TAG_TYPE[String(value).toUpperCase()] ?? "gray";
        return (
          <TableCell key={cellId}>
            <Tag type={tagType} size="sm">
              {formatCapitalizedEnum(value)}
            </Tag>
          </TableCell>
        );
      }
      case "updatedAt":
        return (
          <TableCell key={cellId}>
            <span className="text-sm text-typography-700">{value ? formatDate(value) : "—"}</span>
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key={cellId}>
            <div className="flex items-center justify-end gap-2">
              <Button
                kind="tertiary"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  if (spec) openSpec(spec);
                }}
              >
                {strings.open}
              </Button>
              <IconButton
                label={strings.delete}
                kind="ghost"
                size="sm"
                align="left"
                onClick={e => {
                  e.stopPropagation();
                  if (spec) setSpecToDelete(spec);
                }}
              >
                <TrashCan />
              </IconButton>
            </div>
          </TableCell>
        );
      default:
        return <TableCell key={cellId}>{value}</TableCell>;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {headers.map(header => (
                  <TableHeader key={header.key}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map(header => (
                    <TableCell key={header.key}>
                      <SkeletonText width={header.key === "actions" ? "80px" : "70%"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (rows.length === 0) {
      return (
        <Tile className="flex flex-col items-center justify-center text-center py-[15%]">
          <h2 className="font-normal text-2xl text-typography-900 mb-2">{strings.emptyTitle}</h2>
          <p className="max-w-xl text-typography-800 text-base mb-4">{strings.emptySubtitle}</p>
          <Button
            kind="primary"
            renderIcon={Add}
            onClick={() => navigate(ROUTES.ROLEPLAY_STUDIO_NEW)}
          >
            {strings.newRoleplay}
          </Button>
        </Tile>
      );
    }

    return (
      <DataTable rows={rows} headers={headers}>
        {({ rows: dataRows, headers: dataHeaders, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dataHeaders.map(header => {
                    const { key, ...headerProps } = getHeaderProps({ header });
                    return (
                      <TableHeader key={key as React.Key} {...headerProps}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataRows.map(row => {
                  const { key, ...rowProps } = getRowProps({ row });
                  const spec = specById.get(row.id);
                  return (
                    <TableRow
                      key={key as React.Key}
                      {...rowProps}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (spec) openSpec(spec);
                      }}
                    >
                      {row.cells.map(cell => renderCell(cell.id, cell.info.header, cell.value, spec))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl text-typography-900">{strings.title}</h1>
          <p className="text-sm text-typography-700 mt-1">{strings.subtitle}</p>
        </div>
        <Button kind="primary" renderIcon={Add} onClick={() => navigate(ROUTES.ROLEPLAY_STUDIO_NEW)}>
          {strings.newRoleplay}
        </Button>
      </div>

      <div className="mt-6 flex-1 min-h-0 overflow-y-auto">{renderContent()}</div>

      <ActionConfirmationPopup
        isOpen={Boolean(specToDelete)}
        onClose={() => setSpecToDelete(null)}
        title={strings.deleteTitle}
        titleItalic={strings.deleteTitleItalic}
        description={strings.deleteDescription}
        primaryButton={{
          label: strings.delete,
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setSpecToDelete(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
