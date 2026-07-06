import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyNodeChanges,
  Background,
  Connection,
  Controls,
  NodeChange,
  OnSelectionChangeParams,
  Panel,
  ReactFlow,
} from "@xyflow/react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import "@xyflow/react/dist/style.css";

import { Add } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, KeyboardKeys } from "@constants";
import {
  removeState,
  removeTransition,
  selectRoleplaySpec,
  updateLayout,
  upsertState,
  upsertTransition,
} from "@reducer";
import { RoleplayStateNode, RoleplayTransition } from "@src/types/roleplayStudio";
import {
  createEmptyRoleplayState,
  createEmptyRoleplayTransition,
  findTransitionsTargetingState,
  ROLEPLAY_MAX_STATES,
  ROLEPLAY_MIN_STATES,
} from "@utils/roleplaySpec";

import {
  nextStatePosition,
  ROLEPLAY_STATE_NODE_TYPE,
  ROLEPLAY_TRANSITION_EDGE_TYPE,
  RoleplayFlowNode,
  specToGraph,
} from "./graphMapping";
import { StateEditorSidePanel } from "./StateEditorSidePanel";
import { StateNode } from "./StateNode";
import { TransitionEdge } from "./TransitionEdge";
import { TransitionEditorSidePanel } from "./TransitionEditorSidePanel";

const nodeTypes = { [ROLEPLAY_STATE_NODE_TYPE]: StateNode };
const edgeTypes = { [ROLEPLAY_TRANSITION_EDGE_TYPE]: TransitionEdge };

interface StateMachineCanvasProps {
  readOnly?: boolean;
}

interface EditingTransition {
  fromStateId: string;
  transition: RoleplayTransition;
}

/**
 * @xyflow/react canvas over the spec's state machine. Node positions are
 * client-owned (spec.ui.layout, persisted with the draft). Edit mode adds:
 * drag-to-position, add state (3-6 bound), connect-to-create-transition
 * (opening the guard editor), click-to-edit side panels, and Delete-key
 * removal with an orphaned-transition confirmation.
 *
 * NOTE: default export — this module (and @xyflow/react) is lazy-loaded.
 */
const StateMachineCanvas: React.FC<StateMachineCanvasProps> = ({ readOnly = false }) => {
  const strings = en.roleplayStudio.stateMachine;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  const graph = useMemo(() => (spec ? specToGraph(spec) : { nodes: [], edges: [] }), [spec]);

  // Nodes live in local state so dragging is fluid; the spec stays the source
  // of truth. Re-derived during render when the spec-derived nodes change
  // (the sanctioned "adjust state when props change" pattern), preserving
  // selection and any in-flight dragged position.
  const [nodes, setNodes] = useState<RoleplayFlowNode[]>(graph.nodes);
  const [prevGraphNodes, setPrevGraphNodes] = useState(graph.nodes);
  if (graph.nodes !== prevGraphNodes) {
    setPrevGraphNodes(graph.nodes);
    setNodes(previous =>
      graph.nodes.map(node => ({
        ...node,
        selected: previous.find(p => p.id === node.id)?.selected ?? false,
        position: previous.find(p => p.id === node.id && p.dragging)?.position ?? node.position,
      })),
    );
  }

  const [selection, setSelection] = useState<OnSelectionChangeParams>({ nodes: [], edges: [] });
  const [editingState, setEditingState] = useState<RoleplayStateNode | null>(null);
  const [editingTransition, setEditingTransition] = useState<EditingTransition | null>(null);
  const [stateToDelete, setStateToDelete] = useState<RoleplayStateNode | null>(null);

  const stateCount = spec?.stateMachine.states.length ?? 0;
  const canAddState = stateCount < ROLEPLAY_MAX_STATES;

  const onNodesChange = useCallback(
    (changes: NodeChange<RoleplayFlowNode>[]) =>
      setNodes(current => applyNodeChanges(changes, current)),
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: RoleplayFlowNode) => {
      if (readOnly) return;
      dispatch(updateLayout({ stateId: node.id, position: node.position }));
    },
    [dispatch, readOnly],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !connection.source || !connection.target) return;
      const transition = createEmptyRoleplayTransition(connection.target);
      dispatch(upsertTransition({ stateId: connection.source, transition }));
      setEditingTransition({ fromStateId: connection.source, transition });
    },
    [dispatch, readOnly],
  );

  const handleAddState = useCallback(() => {
    if (!spec || !canAddState || readOnly) return;
    const state = createEmptyRoleplayState(`State ${stateCount + 1}`);
    dispatch(upsertState(state));
    dispatch(updateLayout({ stateId: state.id, position: nextStatePosition(spec) }));
    setEditingState(state);
  }, [canAddState, dispatch, readOnly, spec, stateCount]);

  const requestDeleteSelection = useCallback(() => {
    if (readOnly || !spec) return;
    const selectedEdge = selection.edges[0];
    if (selectedEdge?.data) {
      dispatch(
        removeTransition({
          stateId: selectedEdge.data.fromStateId as string,
          transitionId: (selectedEdge.data.transition as RoleplayTransition).id,
        }),
      );
      return;
    }
    const selectedNode = selection.nodes[0];
    if (!selectedNode) return;
    if (stateCount <= ROLEPLAY_MIN_STATES) {
      toast.error(strings.minStatesTooltip);
      return;
    }
    const state = spec.stateMachine.states.find(item => item.id === selectedNode.id);
    if (state) setStateToDelete(state);
  }, [dispatch, readOnly, selection, spec, stateCount]);

  // Delete/Backspace handling is ours (deleteKeyCode={null} below) so state
  // removal always routes through the orphaned-transition confirmation.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== KeyboardKeys.DELETE && event.key !== KeyboardKeys.BACKSPACE) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      requestDeleteSelection();
    };
    window.addEventListener(KeyboardKeys.KEYDOWN, handleKeyDown);
    return () => window.removeEventListener(KeyboardKeys.KEYDOWN, handleKeyDown);
  }, [requestDeleteSelection]);

  const orphanedTransitions = useMemo(
    () => (spec && stateToDelete ? findTransitionsTargetingState(spec, stateToDelete.id) : []),
    [spec, stateToDelete],
  );

  const confirmDeleteState = () => {
    if (stateToDelete) dispatch(removeState(stateToDelete.id));
    setStateToDelete(null);
  };

  if (!spec) return null;

  return (
    <div className="h-full w-full rounded-lg border border-border-light bg-white overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onSelectionChange={setSelection}
        onNodeClick={(_event, node) => {
          if (readOnly) return;
          const state = spec.stateMachine.states.find(item => item.id === node.id);
          if (state) setEditingState(state);
        }}
        onEdgeClick={(_event, edge) => {
          if (readOnly || !edge.data) return;
          setEditingTransition({
            fromStateId: edge.data.fromStateId as string,
            transition: edge.data.transition as RoleplayTransition,
          });
        }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        deleteKeyCode={null}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <Panel position="top-left">
          {readOnly ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-typography-700">
              {strings.readOnly}
            </span>
          ) : (
            <span title={canAddState ? "" : strings.maxStatesTooltip}>
              <Button
                variant={ButtonVariant.SECONDARY}
                className="h-[34px] px-3 text-sm bg-white"
                disabled={!canAddState}
                onClick={handleAddState}
              >
                <Add />
                {strings.addState}
              </Button>
            </span>
          )}
        </Panel>
      </ReactFlow>

      {editingState && (
        <StateEditorSidePanel
          state={spec.stateMachine.states.find(item => item.id === editingState.id) ?? editingState}
          isInitial={spec.stateMachine.initialStateId === editingState.id}
          onClose={() => setEditingState(null)}
        />
      )}

      {editingTransition && (
        <TransitionEditorSidePanel
          fromStateId={editingTransition.fromStateId}
          transition={editingTransition.transition}
          onClose={() => setEditingTransition(null)}
        />
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(stateToDelete)}
        onClose={() => setStateToDelete(null)}
        title={strings.deleteStateTitle}
        titleItalic={strings.deleteStateTitleItalic}
        description={strings.deleteStateDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: confirmDeleteState,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setStateToDelete(null),
          variant: ButtonVariant.SECONDARY,
        }}
      >
        <div className="mt-2 text-left">
          {orphanedTransitions.length > 0 ? (
            <>
              <p className="text-sm font-medium text-typography-900">
                {strings.orphanedTransitions}
              </p>
              <ul className="mt-1 list-disc list-inside">
                {orphanedTransitions.map(({ fromStateName, transition }) => (
                  <li key={transition.id} className="text-sm text-typography-700">
                    {fromStateName} → {stateToDelete?.name}
                    {transition.description ? ` — ${transition.description}` : ""}
                  </li>
                ))}
                {(stateToDelete?.transitions ?? []).map(transition => (
                  <li key={transition.id} className="text-sm text-typography-700">
                    {stateToDelete?.name} → …
                    {transition.description ? ` — ${transition.description}` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-typography-700">{strings.noOrphanedTransitions}</p>
          )}
        </div>
      </ActionConfirmationPopup>
    </div>
  );
};

export default StateMachineCanvas;
