<script>
	import { layers, imageInfo, addLayer, removeLayer } from '$lib/stores/editor.js';

	let stickerSize = $state(64);

	const emojiGroups = [
		{ label: 'Faces', emojis: ['😀','😂','😍','🥰','😎','🤩','😱','🥳','😈','🤡'] },
		{ label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💖','💝'] },
		{ label: 'Stars', emojis: ['⭐','🌟','✨','💫','🔥','💥','🌈','☀️','🌙','⚡'] },
		{ label: 'Fun', emojis: ['🎉','🎊','🎈','🎀','🎁','🎵','🎶','🦄','🍕','🍩'] },
		{ label: 'Symbols', emojis: ['✅','❌','⚠️','💯','🏆','👑','💎','🔮','🎯','♾️'] },
	];

	const stickerLayers = $derived($layers.filter(l => l.type === 'sticker'));

	function addSticker(emoji) {
		addLayer('sticker', `Sticker: ${emoji}`, {
			emoji,
			x: $imageInfo.width / 3 + Math.random() * 100,
			y: $imageInfo.height / 3 + Math.random() * 100,
			size: stickerSize
		});
	}

	function removeSticker(id) {
		removeLayer(id);
	}

	function clearAll() {
		const ids = stickerLayers.map(l => l.id);
		for (const id of ids) removeLayer(id);
	}
</script>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Stickers</h3>
		{#if stickerLayers.length > 0}
			<button class="reset-btn" onclick={clearAll}>Clear All</button>
		{/if}
	</div>

	<div class="mb-3">
		<div class="flex justify-between text-xs mb-1">
			<span>Size</span>
			<span class="text-editor-muted">{stickerSize}px</span>
		</div>
		<input type="range" min="16" max="200" step="4" bind:value={stickerSize} class="w-full">
	</div>

	{#each emojiGroups as group}
		<div class="mb-3">
			<p class="text-xs text-editor-muted mb-1">{group.label}</p>
			<div class="flex flex-wrap gap-1">
				{#each group.emojis as emoji}
					<button class="emoji-btn" onclick={() => addSticker(emoji)} title="Add {emoji}">
						{emoji}
					</button>
				{/each}
			</div>
		</div>
	{/each}

	{#if stickerLayers.length > 0}
		<div class="border-t border-editor-border pt-2">
			<p class="text-xs text-editor-muted mb-1">Placed ({stickerLayers.length})</p>
			{#each stickerLayers as layer (layer.id)}
				<div class="layer-item">
					<span class="text-sm">{layer.data.emoji}</span>
					<span class="text-xs text-editor-muted flex-1">({Math.round(layer.data.x)}, {Math.round(layer.data.y)})</span>
					<button class="del-btn" onclick={() => removeSticker(layer.id)}>x</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }
	.reset-btn {
		font-size: 0.6875rem;
		color: var(--color-editor-accent);
		background: none;
		border: none;
		cursor: pointer;
	}
	.emoji-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
		font-size: 1rem;
		transition: transform 0.1s;
	}
	.emoji-btn:hover { transform: scale(1.2); border-color: var(--color-editor-accent); }
	.layer-item {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.375rem;
		gap: 0.375rem;
		border-radius: 0.25rem;
	}
	.layer-item:hover { background: var(--color-editor-panel); }
	.del-btn {
		background: none;
		border: none;
		color: var(--color-editor-accent);
		cursor: pointer;
		font-size: 0.75rem;
	}
</style>
