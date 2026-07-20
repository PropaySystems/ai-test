<?php

namespace App\Repositories\Contracts;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Support\Collection;

interface TodoRepositoryInterface
{
    /**
     * @return Collection<int, Todo>
     */
    public function allForUser(User $user): Collection;

    public function findOwnedOrFail(User $user, int $id): Todo;

    /**
     * @param  array{title: string, description: string|null, completed?: bool}  $data
     */
    public function createForUser(User $user, array $data): Todo;

    /**
     * @param  array{title?: string, description?: string|null, completed?: bool}  $data
     */
    public function update(Todo $todo, array $data): Todo;

    public function toggleComplete(Todo $todo): Todo;

    public function delete(Todo $todo): void;
}
