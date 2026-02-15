<script>
	import { layers, activeLayerId, imageInfo, addLayer, removeLayer, updateLayerData } from '$lib/stores/editor.js';

	let newText = $state('Your Text');
	let fontSize = $state(48);
	let fontFamily = $state('Arial');
	let textColor = $state('#ffffff');
	let textOpacity = $state(1);
	let bold = $state(false);
	let italic = $state(false);
	let textAlign = $state('left');
	let shadow = $state(true);
	let outline = $state(false);
	let outlineColor = $state('#000000');

	const fonts = [
		'Arial', 'Georgia', 'Impact', 'Courier New', 'Verdana',
		'Times New Roman', 'Trebuchet MS', 'Comic Sans MS',
		'Palatino', 'Garamond'
	];

	// Get only text layers
	const textLayersList = $derived($layers.filter(l => l.type === 'text'));

	let selectedLayerId = $state(null);
	const selectedLayer = $derived(textLayersList.find(l => l.id === selectedLayerId));

	function addText() {
		addLayer('text', `Text: ${newText.substring(0, 12)}`, {
			text: newText,
			x: $imageInfo.width / 4,
			y: $imageInfo.height / 2,
			size: fontSize,
			font: fontFamily,
			color: textColor,
			opacity: textOpacity,
			bold, italic,
			align: textAlign,
			shadow, outline, outlineColor
		});
		selectedLayerId = null;
	}

	function removeTextLayer(id) {
		removeLayer(id);
		if (selectedLayerId === id) selectedLayerId = null;
	}

	function updateField(id, key, value) {
		updateLayerData(id, { [key]: value });
	}
</script>

<div class="panel">
	<h3 class="panel-title mb-3">Text Overlay</h3>

	<div class="mb-3">
		<input type="text" bind:value={newText} class="text-input w-full mb-2" placeholder="Enter text...">

		<div class="grid grid-cols-2 gap-2 mb-2">
			<select bind:value={fontFamily} class="select-input">
				{#each fonts as f}
					<option value={f}>{f}</option>
				{/each}
			</select>
			<input type="number" bind:value={fontSize} class="num-input" min="8" max="200">
		</div>

		<div class="flex gap-2 mb-2 items-center">
			<input type="color" bind:value={textColor} class="color-input">
			<label class="flex items-center gap-1 text-xs">
				<input type="range" bind:value={textOpacity} min="0" max="1" step="0.05" class="w-16">
				{Math.round(textOpacity * 100)}%
			</label>
		</div>

		<div class="flex gap-1 mb-2">
			<button class="toggle-btn" class:active={bold} onclick={() => bold = !bold}><b>B</b></button>
			<button class="toggle-btn" class:active={italic} onclick={() => italic = !italic}><i>I</i></button>
			<button class="toggle-btn" class:active={textAlign==='left'} onclick={() => textAlign='left'}>L</button>
			<button class="toggle-btn" class:active={textAlign==='center'} onclick={() => textAlign='center'}>C</button>
			<button class="toggle-btn" class:active={textAlign==='right'} onclick={() => textAlign='right'}>R</button>
		</div>

		<div class="flex gap-2 mb-2 text-xs">
			<label class="flex items-center gap-1">
				<input type="checkbox" bind:checked={shadow}> Shadow
			</label>
			<label class="flex items-center gap-1">
				<input type="checkbox" bind:checked={outline}> Outline
			</label>
			{#if outline}
				<input type="color" bind:value={outlineColor} class="color-input">
			{/if}
		</div>

		<button class="add-btn w-full" onclick={addText}>Add Text</button>
	</div>

	{#if textLayersList.length > 0}
		<div class="border-t border-editor-border pt-2">
			<p class="text-xs text-editor-muted mb-1">Text Layers ({textLayersList.length})</p>
			{#each textLayersList as layer (layer.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="layer-item" class:selected={selectedLayerId === layer.id} onclick={() => { selectedLayerId = layer.id; activeLayerId.set(layer.id); }} onkeydown={(e) => e.key === 'Enter' && (selectedLayerId = layer.id)} role="button" tabindex="0">
					<span class="text-xs truncate flex-1">"{layer.data.text}"</span>
					<button class="del-btn" onclick={(e) => { e.stopPropagation(); removeTextLayer(layer.id); }}>x</button>
				</div>
			{/each}
		</div>

		{#if selectedLayer}
			{@const d = selectedLayer.data}
			<div class="border-t border-editor-border pt-2 mt-2">
				<p class="text-xs text-editor-muted mb-1">Edit Layer</p>
				<input type="text" value={d.text} class="text-input w-full mb-1"
					oninput={(e) => updateField(selectedLayer.id, 'text', e.target.value)}>
				<div class="flex gap-2">
					<input type="number" value={d.size} class="num-input" min="8" max="200"
						oninput={(e) => updateField(selectedLayer.id, 'size', +e.target.value)}>
					<input type="color" value={d.color} class="color-input"
						oninput={(e) => updateField(selectedLayer.id, 'color', e.target.value)}>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }
	.text-input {
		padding: 0.375rem 0.5rem;
		font-size: 0.8125rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
	}
	.select-input {
		padding: 0.25rem;
		font-size: 0.75rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
	}
	.num-input {
		width: 100%;
		padding: 0.25rem;
		font-size: 0.75rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
	}
	.color-input {
		width: 28px; height: 28px;
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		background: none;
		cursor: pointer;
		padding: 0;
	}
	.toggle-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
	}
	.toggle-btn.active { background: var(--color-editor-accent); border-color: var(--color-editor-accent); }
	.add-btn {
		padding: 0.375rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		background: var(--color-editor-accent);
		color: white;
		border: none;
		cursor: pointer;
	}
	.add-btn:hover { opacity: 0.9; }
	.layer-item {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.375rem;
		border-radius: 0.25rem;
		cursor: pointer;
		gap: 0.25rem;
	}
	.layer-item:hover { background: var(--color-editor-panel); }
	.layer-item.selected { background: var(--color-editor-hover); }
	.del-btn {
		background: none;
		border: none;
		color: var(--color-editor-accent);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0 0.25rem;
	}
</style>
