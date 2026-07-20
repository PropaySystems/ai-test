<?php

use App\Livewire\Todos\Index;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::livewire('todos', Index::class)->name('todos.index');
});
