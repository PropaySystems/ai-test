<?php

namespace Tests\Feature\Todos;

use App\Livewire\Todos\Index;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class TodoTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('todos.index'))
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_todos_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('todos.index'))
            ->assertOk();
    }

    public function test_user_can_create_a_todo(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        Livewire::test(Index::class)
            ->set('title', 'Buy groceries')
            ->set('description', 'Milk, eggs, bread')
            ->call('createTodo')
            ->assertHasNoErrors();

        $this->assertDatabaseHas('todos', [
            'user_id' => $user->id,
            'title' => 'Buy groceries',
            'description' => 'Milk, eggs, bread',
            'completed' => false,
        ]);
    }

    public function test_user_sees_only_their_own_todos(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownTodo = Todo::factory()->for($user)->create(['title' => 'My todo']);
        Todo::factory()->for($otherUser)->create(['title' => 'Other todo']);

        $this->actingAs($user);

        Livewire::test(Index::class)
            ->assertSee('My todo')
            ->assertDontSee('Other todo');

        $this->assertTrue(
            $user->todos()->whereKey($ownTodo)->exists()
        );
    }

    public function test_user_can_edit_their_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->for($user)->create([
            'title' => 'Old title',
            'description' => 'Old description',
        ]);

        $this->actingAs($user);

        Livewire::test(Index::class)
            ->call('startEditing', $todo->id)
            ->set('editTitle', 'New title')
            ->set('editDescription', 'New description')
            ->call('updateTodo')
            ->assertHasNoErrors();

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'title' => 'New title',
            'description' => 'New description',
        ]);
    }

    public function test_user_can_toggle_todo_complete_status(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->for($user)->create(['completed' => false]);

        $this->actingAs($user);

        Livewire::test(Index::class)
            ->call('toggleComplete', $todo->id)
            ->assertHasNoErrors();

        $this->assertTrue($todo->fresh()->completed);

        Livewire::test(Index::class)
            ->call('toggleComplete', $todo->id)
            ->assertHasNoErrors();

        $this->assertFalse($todo->fresh()->completed);
    }

    public function test_user_can_delete_their_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->for($user)->create();

        $this->actingAs($user);

        Livewire::test(Index::class)
            ->call('deleteTodo', $todo->id)
            ->assertHasNoErrors();

        $this->assertDatabaseMissing('todos', ['id' => $todo->id]);
    }

    public function test_acting_on_another_users_todo_fails(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $todo = Todo::factory()->for($otherUser)->create();

        $this->actingAs($user);

        foreach (['startEditing', 'toggleComplete', 'deleteTodo'] as $method) {
            try {
                Livewire::test(Index::class)->call($method, $todo->id);

                $this->fail("Expected ModelNotFoundException when calling {$method}.");
            } catch (ModelNotFoundException) {
                // Scoped findOrFail correctly hides other users' todos.
            }
        }

        $this->assertDatabaseHas('todos', ['id' => $todo->id]);
    }
}
